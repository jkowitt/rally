import Foundation
import OSLog
import RallyCore

/// WebSocket client for real-time gameday communication.
///
/// Built on `URLSessionWebSocketTask`, this client manages the full
/// lifecycle of a WebSocket connection: connecting, sending, receiving,
/// heartbeat ping/pong, and automatic reconnection with jittered
/// exponential backoff.
///
/// ## Typical Usage
///
/// ```swift
/// let ws = WebSocketClient(
///     baseURL: URL(string: "wss://api.rally.app/v1")!,
///     tokenManager: tokenManager
/// )
/// try await ws.connect(eventId: "evt_123")
///
/// for await message in ws.messages {
///     switch message {
///     case .activationUpdate(let activation):
///         // handle live activation push
///     case .scoreUpdate(let home, let away):
///         // handle score change
///     }
/// }
/// ```
public actor WebSocketClient {

    // MARK: - Types

    /// Inbound messages decoded from the WebSocket stream.
    public enum GamedayMessage: Sendable {
        case activationUpdate(Activation)
        case scoreUpdate(home: Int, away: Int)
        case eventStatusChange(EventStatus)
        case cheerMeter(level: Double)
        case announcement(String)
        case raw(Data)
    }

    /// The current connection state.
    public enum ConnectionState: Sendable, Equatable {
        case disconnected
        case connecting
        case connected
        case reconnecting(attempt: Int)
    }

    /// Internal wire-format envelope received from the server.
    private struct ServerEnvelope: Codable, Sendable {
        let type: String
        let payload: Payload

        struct Payload: Codable, Sendable {
            // Score
            let homeScore: Int?
            let awayScore: Int?
            // Status
            let status: String?
            // Cheer
            let level: Double?
            // Announcement
            let message: String?
            // Activation (embedded JSON, decoded separately)
            let activation: Activation?
        }
    }

    // MARK: - Configuration

    /// Configuration for the WebSocket client.
    public struct Configuration: Sendable {
        /// Interval between heartbeat pings.
        public let heartbeatInterval: TimeInterval
        /// Maximum number of automatic reconnection attempts.
        public let maxReconnectAttempts: Int
        /// Base delay for reconnection backoff.
        public let reconnectBaseDelay: TimeInterval
        /// Maximum delay cap for reconnection backoff.
        public let maxReconnectDelay: TimeInterval

        public init(
            heartbeatInterval: TimeInterval = 30,
            maxReconnectAttempts: Int = 10,
            reconnectBaseDelay: TimeInterval = 1.0,
            maxReconnectDelay: TimeInterval = 60
        ) {
            self.heartbeatInterval = heartbeatInterval
            self.maxReconnectAttempts = maxReconnectAttempts
            self.reconnectBaseDelay = reconnectBaseDelay
            self.maxReconnectDelay = maxReconnectDelay
        }
    }

    // MARK: - Properties

    private static let logger = Logger(
        subsystem: "app.rally.networking",
        category: "WebSocketClient"
    )

    private let baseURL: URL
    private let tokenManager: AuthTokenManager
    private let config: Configuration

    private let decoder: JSONDecoder

    private var webSocketTask: URLSessionWebSocketTask?
    private var heartbeatTask: Task<Void, Never>?
    private var receiveTask: Task<Void, Never>?

    private var currentEventId: String?
    private var messageContinuations: [UUID: AsyncStream<GamedayMessage>.Continuation] = [:]
    private var stateContinuations: [UUID: AsyncStream<ConnectionState>.Continuation] = [:]
    private var intentionalDisconnect: Bool = false

    /// The current connection state.
    public private(set) var state: ConnectionState = .disconnected {
        didSet {
            guard state != oldValue else { return }
            for continuation in stateContinuations.values {
                continuation.yield(state)
            }
        }
    }

    // MARK: - Initialization

    /// Creates a new WebSocket client.
    ///
    /// - Parameters:
    ///   - baseURL: The base URL for the WebSocket server (e.g.,
    ///     `wss://api.rally.app/v1`).
    ///   - tokenManager: The ``AuthTokenManager`` to fetch the Bearer token.
    ///   - configuration: Optional tuning for heartbeat and reconnection.
    public init(
        baseURL: URL,
        tokenManager: AuthTokenManager,
        configuration: Configuration = Configuration()
    ) {
        self.baseURL = baseURL
        self.tokenManager = tokenManager
        self.config = configuration

        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        dec.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = dec
    }

    // MARK: - Public API

    /// Opens a WebSocket connection for the specified event.
    ///
    /// If a connection is already open for a different event, it is
    /// closed first.
    ///
    /// - Parameter eventId: The event identifier to subscribe to.
    public func connect(eventId: String) async throws {
        // Disconnect any existing connection
        if webSocketTask != nil {
            await disconnectInternal(code: .goingAway)
        }

        intentionalDisconnect = false
        currentEventId = eventId
        state = .connecting

        try await establishConnection(eventId: eventId)
    }

    /// Gracefully closes the WebSocket connection.
    public func disconnect() async {
        intentionalDisconnect = true
        await disconnectInternal(code: .normalClosure)
    }

    /// Sends a JSON-encodable message to the server.
    ///
    /// - Parameter value: An `Encodable` value serialised as JSON text.
    public func send<T: Encodable & Sendable>(_ value: T) async throws {
        guard let task = webSocketTask else {
            Self.logger.error("Cannot send — WebSocket is not connected")
            throw APIError.networkUnavailable
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(value)

        guard let string = String(data: data, encoding: .utf8) else {
            throw APIError.encodingFailed(
                NSError(domain: "WebSocket", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to encode message as UTF-8 string"
                ])
            )
        }

        try await task.send(.string(string))
        Self.logger.debug("↑ WS sent \(data.count) bytes")
    }

    /// An `AsyncStream` of decoded ``GamedayMessage`` values.
    /// Multiple consumers may each hold their own stream.
    public var messages: AsyncStream<GamedayMessage> {
        let id = UUID()
        return AsyncStream { continuation in
            messageContinuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                guard let self else { return }
                Task { await self.removeMessageContinuation(id: id) }
            }
        }
    }

    /// An `AsyncStream` of ``ConnectionState`` changes.
    public var stateStream: AsyncStream<ConnectionState> {
        let id = UUID()
        return AsyncStream { continuation in
            stateContinuations[id] = continuation
            continuation.yield(state)
            continuation.onTermination = { [weak self] _ in
                guard let self else { return }
                Task { await self.removeStateContinuation(id: id) }
            }
        }
    }

    // MARK: - Connection Lifecycle

    private func establishConnection(eventId: String) async throws {
        guard let token = await tokenManager.accessToken else {
            Self.logger.error("No access token for WebSocket connection")
            throw APIError.unauthorized
        }

        // Build ws URL: /ws/gameday/:eventId
        let wsURL = baseURL.appendingPathComponent("ws/gameday/\(eventId)")

        var request = URLRequest(url: wsURL)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 10

        Self.logger.debug(
            "Connecting WebSocket to \(wsURL.absoluteString) [token: \(token, privacy: .private)]"
        )

        let session = URLSession(configuration: .default)
        let task = session.webSocketTask(with: request)
        task.maximumMessageSize = 1_048_576 // 1 MB
        webSocketTask = task
        task.resume()

        state = .connected
        Self.logger.info("WebSocket connected for event \(eventId)")

        startHeartbeat()
        startReceiving()
    }

    private func disconnectInternal(code: URLSessionWebSocketTask.CloseCode) async {
        heartbeatTask?.cancel()
        heartbeatTask = nil
        receiveTask?.cancel()
        receiveTask = nil

        webSocketTask?.cancel(with: code, reason: nil)
        webSocketTask = nil
        state = .disconnected
        currentEventId = nil

        Self.logger.info("WebSocket disconnected (code: \(code.rawValue))")
    }

    // MARK: - Heartbeat

    private func startHeartbeat() {
        heartbeatTask?.cancel()
        heartbeatTask = Task { [weak self, config] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(config.heartbeatInterval))
                guard !Task.isCancelled, let self else { return }
                await self.sendPing()
            }
        }
    }

    private func sendPing() {
        guard let task = webSocketTask else { return }
        task.sendPing { [weak self] error in
            guard let self else { return }
            if let error {
                Self.logger.error("Heartbeat ping failed: \(error.localizedDescription)")
                Task {
                    await self.handleConnectionFailure()
                }
            } else {
                Self.logger.debug("♡ Heartbeat ping/pong OK")
            }
        }
    }

    // MARK: - Receiving

    private func startReceiving() {
        receiveTask?.cancel()
        receiveTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                guard let task = await self.webSocketTask else { return }
                do {
                    let message = try await task.receive()
                    await self.handleMessage(message)
                } catch {
                    if !Task.isCancelled {
                        Self.logger.error("WebSocket receive error: \(error.localizedDescription)")
                        await self.handleConnectionFailure()
                    }
                    return
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        let data: Data
        switch message {
        case .string(let text):
            guard let textData = text.data(using: .utf8) else { return }
            data = textData
            Self.logger.debug("↓ WS received \(textData.count) bytes (text)")
        case .data(let binaryData):
            data = binaryData
            Self.logger.debug("↓ WS received \(binaryData.count) bytes (binary)")
        @unknown default:
            return
        }

        let gamedayMessage = decodeMessage(data)
        for continuation in messageContinuations.values {
            continuation.yield(gamedayMessage)
        }
    }

    private func decodeMessage(_ data: Data) -> GamedayMessage {
        guard let envelope = try? decoder.decode(ServerEnvelope.self, from: data) else {
            Self.logger.debug("Could not decode envelope — forwarding raw data")
            return .raw(data)
        }

        switch envelope.type {
        case "activation_update":
            if let activation = envelope.payload.activation {
                return .activationUpdate(activation)
            }
            return .raw(data)

        case "score_update":
            if let home = envelope.payload.homeScore,
               let away = envelope.payload.awayScore {
                return .scoreUpdate(home: home, away: away)
            }
            return .raw(data)

        case "event_status":
            if let statusString = envelope.payload.status,
               let status = EventStatus(rawValue: statusString) {
                return .eventStatusChange(status)
            }
            return .raw(data)

        case "cheer_meter":
            if let level = envelope.payload.level {
                return .cheerMeter(level: level)
            }
            return .raw(data)

        case "announcement":
            if let message = envelope.payload.message {
                return .announcement(message)
            }
            return .raw(data)

        default:
            Self.logger.debug("Unknown WebSocket message type: \(envelope.type)")
            return .raw(data)
        }
    }

    // MARK: - Reconnection

    private func handleConnectionFailure() async {
        guard !intentionalDisconnect, let eventId = currentEventId else {
            await disconnectInternal(code: .abnormalClosure)
            return
        }

        // Clean up the failed connection without clearing currentEventId
        heartbeatTask?.cancel()
        heartbeatTask = nil
        receiveTask?.cancel()
        receiveTask = nil
        webSocketTask?.cancel(with: .abnormalClosure, reason: nil)
        webSocketTask = nil

        for attempt in 0 ..< config.maxReconnectAttempts {
            guard !intentionalDisconnect else { return }

            state = .reconnecting(attempt: attempt + 1)

            let delay = reconnectDelay(for: attempt)
            Self.logger.info(
                "WebSocket reconnect attempt \(attempt + 1)/\(self.config.maxReconnectAttempts) in \(delay)s"
            )

            do {
                try await Task.sleep(for: .seconds(delay))
                guard !intentionalDisconnect else { return }
                try await establishConnection(eventId: eventId)
                Self.logger.info("WebSocket reconnected on attempt \(attempt + 1)")
                return
            } catch is CancellationError {
                return
            } catch {
                Self.logger.error(
                    "Reconnect attempt \(attempt + 1) failed: \(error.localizedDescription)"
                )
                continue
            }
        }

        Self.logger.error("WebSocket reconnection exhausted all \(self.config.maxReconnectAttempts) attempts")
        state = .disconnected
    }

    /// Jittered exponential backoff: base * 2^attempt, capped at
    /// `maxReconnectDelay`, with random jitter of ±25 %.
    private func reconnectDelay(for attempt: Int) -> TimeInterval {
        let exponential = config.reconnectBaseDelay * pow(2.0, Double(attempt))
        let capped = min(exponential, config.maxReconnectDelay)
        let jitter = capped * Double.random(in: -0.25 ... 0.25)
        return capped + jitter
    }

    // MARK: - Continuation Cleanup

    private func removeMessageContinuation(id: UUID) {
        messageContinuations.removeValue(forKey: id)
    }

    private func removeStateContinuation(id: UUID) {
        stateContinuations.removeValue(forKey: id)
    }
}
