import Foundation
import RallyCore
import RallyNetworking
import RallyLocation

// MARK: - WebSocket Message

/// Incoming real-time message from the gameday WebSocket.
public struct GamedaySocketMessage: Codable, Sendable {
    public let type: MessageType
    public let eventID: String
    public let payload: Payload

    public enum MessageType: String, Codable, Sendable {
        case scoreUpdate = "score_update"
        case activationStarted = "activation_started"
        case activationEnded = "activation_ended"
        case leaderboardUpdate = "leaderboard_update"
        case eventStatusChange = "event_status_change"
    }

    public struct Payload: Codable, Sendable {
        public let homeScore: Int?
        public let awayScore: Int?
        public let period: String?
        public let activation: Activation?
        public let leaderboard: Leaderboard?
        public let eventStatus: EventStatus?
    }
}

// MARK: - Gameday Phase

/// High-level phase of the gameday experience for driving UI state.
public enum GamedayPhase: Sendable, Hashable {
    case preGame
    case checkInAvailable
    case checkedIn
    case live
    case postGame
}

// MARK: - Check-In State

/// Discrete states of the check-in flow, each with its own UI treatment.
public enum CheckInFlowState: Sendable, Hashable {
    case idle
    case verifyingLocation
    case scanningBeacon
    case beaconFound
    case submitting
    case success(pointsEarned: Int)
    case failed(message: String)
}

// MARK: - GamedayViewModel

/// Central view model for the gameday experience.
///
/// Coordinates event data loading, real-time WebSocket updates,
/// the check-in flow, activation management, and leaderboard polling.
/// All UI-facing state is published on `@MainActor`.
@MainActor
@Observable
public final class GamedayViewModel {

    // MARK: - Published State

    /// The current event being displayed.
    public private(set) var event: Event?

    /// All activations for the current event, ordered by start time.
    public private(set) var activations: [Activation] = []

    /// The currently active (live) activation, if any.
    public private(set) var activeActivation: Activation?

    /// Current gameday phase.
    public private(set) var phase: GamedayPhase = .preGame

    /// Check-in flow state machine.
    public private(set) var checkInState: CheckInFlowState = .idle

    /// Latest leaderboard snapshot.
    public private(set) var leaderboard: Leaderboard?

    /// Current user's total gameday points.
    public private(set) var userPoints: Int = 0

    /// Live score: home team.
    public private(set) var homeScore: Int = 0

    /// Live score: away team.
    public private(set) var awayScore: Int = 0

    /// Current period or quarter label.
    public private(set) var periodLabel: String = ""

    /// Whether initial data is loading.
    public private(set) var isLoading: Bool = false

    /// Most recent error message, cleared on next successful operation.
    public private(set) var errorMessage: String?

    /// Whether the user has already checked in for this event.
    public private(set) var hasCheckedIn: Bool = false

    // MARK: - Dependencies

    private let eventRepository: any EventRepositoryProtocol
    private let checkInRepository: any CheckInRepositoryProtocol
    private let activationRepository: any ActivationRepositoryProtocol
    private let leaderboardRepository: any LeaderboardRepositoryProtocol
    private let locationService: any LocationServiceProtocol
    private let eventID: String

    // MARK: - Internal State

    private var webSocketTask: URLSessionWebSocketTask?
    private var pollingTask: Task<Void, Never>?
    private var webSocketListenTask: Task<Void, Never>?

    // MARK: - Init

    public init(
        eventID: String,
        eventRepository: any EventRepositoryProtocol,
        checkInRepository: any CheckInRepositoryProtocol,
        activationRepository: any ActivationRepositoryProtocol,
        leaderboardRepository: any LeaderboardRepositoryProtocol,
        locationService: any LocationServiceProtocol
    ) {
        self.eventID = eventID
        self.eventRepository = eventRepository
        self.checkInRepository = checkInRepository
        self.activationRepository = activationRepository
        self.leaderboardRepository = leaderboardRepository
        self.locationService = locationService
    }

    deinit {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        pollingTask?.cancel()
        webSocketListenTask?.cancel()
    }

    // MARK: - Lifecycle

    /// Load the event and begin real-time updates.
    public func onAppear() async {
        isLoading = true
        errorMessage = nil

        do {
            let fetchedEvent = try await eventRepository.fetchEvent(id: eventID)
            self.event = fetchedEvent
            self.activations = fetchedEvent.activations.sorted { ($0.startsAt ?? .distantFuture) < ($1.startsAt ?? .distantFuture) }
            self.homeScore = fetchedEvent.homeScore ?? 0
            self.awayScore = fetchedEvent.awayScore ?? 0
            updatePhase(for: fetchedEvent)
            updateActiveActivation()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false

        await connectWebSocket()
        startFallbackPolling()
        await loadLeaderboard()
    }

    /// Clean up when the view disappears.
    public func onDisappear() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        pollingTask?.cancel()
        pollingTask = nil
        webSocketListenTask?.cancel()
        webSocketListenTask = nil
    }

    // MARK: - Check-In Flow

    /// Initiates the check-in flow: verify location, scan for beacons, submit proof.
    public func startCheckIn() async {
        guard let event, checkInState == .idle || isCheckInRetryable else { return }

        checkInState = .verifyingLocation

        do {
            // Step 1: Get GPS coordinates
            let coords = try await locationService.currentLocation()

            // Step 2: Attempt beacon detection (best-effort, non-blocking timeout)
            checkInState = .scanningBeacon
            let beaconReading = await scanForBeacon(event: event)

            if beaconReading != nil {
                checkInState = .beaconFound
                // Brief pause so the user sees the beacon confirmation
                try? await Task.sleep(for: .milliseconds(600))
            }

            // Step 3: Build proof and submit
            checkInState = .submitting
            let proof = CheckInProof(
                latitude: coords.latitude,
                longitude: coords.longitude,
                horizontalAccuracy: 10.0,
                beaconUUID: beaconReading?.uuid.uuidString,
                beaconMajor: beaconReading?.major,
                beaconMinor: beaconReading?.minor,
                beaconProximity: beaconReading?.proximity.rawValue,
                attestationToken: nil // App Attest token appended by the network layer
            )

            let response = try await checkInRepository.submitCheckIn(
                eventID: event.id,
                proof: proof
            )

            checkInState = .success(pointsEarned: response.pointsEarned)
            hasCheckedIn = true
            userPoints += response.pointsEarned
            phase = .checkedIn

        } catch {
            checkInState = .failed(message: error.localizedDescription)
        }
    }

    /// Reset the check-in state so the user can retry after a failure.
    public func resetCheckIn() {
        guard isCheckInRetryable else { return }
        checkInState = .idle
    }

    private var isCheckInRetryable: Bool {
        if case .failed = checkInState { return true }
        return false
    }

    // MARK: - Activation Submission

    /// Submit an answer for a prediction or trivia activation.
    public func submitAnswer(activationID: String, optionID: String) async throws -> SubmissionResult {
        let result = try await activationRepository.submitAnswer(
            activationID: activationID,
            optionID: optionID
        )
        userPoints = result.newBalance
        return result
    }

    /// Submit a noise meter reading.
    public func submitNoiseMeter(activationID: String, decibelLevel: Double) async throws -> SubmissionResult {
        let result = try await activationRepository.submitNoiseMeter(
            activationID: activationID,
            decibelLevel: decibelLevel
        )
        userPoints = result.newBalance
        return result
    }

    // MARK: - Leaderboard

    /// Refresh the leaderboard from the server.
    public func loadLeaderboard() async {
        do {
            leaderboard = try await leaderboardRepository.fetchLeaderboard(eventID: eventID)
        } catch {
            // Leaderboard failures are non-fatal; the UI shows a stale snapshot.
        }
    }

    // MARK: - WebSocket

    private func connectWebSocket() async {
        guard let url = URL(string: "wss://api.rally.app/v1/events/\(eventID)/live") else { return }

        let session = URLSession(configuration: .default)
        let task = session.webSocketTask(with: url)
        self.webSocketTask = task
        task.resume()

        webSocketListenTask = Task { [weak self] in
            await self?.listenForMessages()
        }
    }

    private func listenForMessages() async {
        guard let task = webSocketTask else { return }

        while !Task.isCancelled {
            do {
                let message = try await task.receive()
                switch message {
                case .string(let text):
                    guard let data = text.data(using: .utf8) else { continue }
                    let decoded = try JSONDecoder().decode(GamedaySocketMessage.self, from: data)
                    handleSocketMessage(decoded)
                case .data(let data):
                    let decoded = try JSONDecoder().decode(GamedaySocketMessage.self, from: data)
                    handleSocketMessage(decoded)
                @unknown default:
                    break
                }
            } catch {
                // Connection dropped; fallback polling will keep state fresh.
                break
            }
        }
    }

    private func handleSocketMessage(_ message: GamedaySocketMessage) {
        switch message.type {
        case .scoreUpdate:
            if let home = message.payload.homeScore { homeScore = home }
            if let away = message.payload.awayScore { awayScore = away }
            if let period = message.payload.period { periodLabel = period }

        case .activationStarted:
            if let activation = message.payload.activation {
                if let index = activations.firstIndex(where: { $0.id == activation.id }) {
                    activations[index] = activation
                } else {
                    activations.append(activation)
                }
                updateActiveActivation()
            }

        case .activationEnded:
            if let activation = message.payload.activation {
                if let index = activations.firstIndex(where: { $0.id == activation.id }) {
                    activations[index] = activation
                }
                updateActiveActivation()
            }

        case .leaderboardUpdate:
            if let lb = message.payload.leaderboard {
                leaderboard = lb
            }

        case .eventStatusChange:
            if let status = message.payload.eventStatus, var evt = event {
                let updated = Event(
                    id: evt.id,
                    schoolID: evt.schoolID,
                    sport: evt.sport,
                    title: evt.title,
                    opponent: evt.opponent,
                    venueID: evt.venueID,
                    startTime: evt.startTime,
                    endTime: evt.endTime,
                    status: status,
                    imageURL: evt.imageURL,
                    activations: evt.activations,
                    homeScore: evt.homeScore,
                    awayScore: evt.awayScore
                )
                event = updated
                updatePhase(for: updated)
            }
        }
    }

    // MARK: - Fallback Polling

    /// Polls the event endpoint every 60 seconds as a fallback when
    /// the WebSocket connection is unavailable.
    private func startFallbackPolling() {
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard !Task.isCancelled else { break }
                await self?.pollEventUpdate()
            }
        }
    }

    private func pollEventUpdate() async {
        do {
            let freshEvent = try await eventRepository.fetchEvent(id: eventID)
            self.event = freshEvent
            self.activations = freshEvent.activations.sorted {
                ($0.startsAt ?? .distantFuture) < ($1.startsAt ?? .distantFuture)
            }
            self.homeScore = freshEvent.homeScore ?? homeScore
            self.awayScore = freshEvent.awayScore ?? awayScore
            updatePhase(for: freshEvent)
            updateActiveActivation()
        } catch {
            // Polling failures are silent; the UI keeps stale data.
        }

        await loadLeaderboard()
    }

    // MARK: - Phase Management

    private func updatePhase(for event: Event) {
        if hasCheckedIn && event.status == .live {
            phase = .live
        } else if hasCheckedIn {
            phase = .checkedIn
        } else if event.status == .completed {
            phase = .postGame
        } else if event.status == .live || event.startTime <= Date.now {
            phase = .checkInAvailable
        } else {
            phase = .preGame
        }
    }

    private func updateActiveActivation() {
        activeActivation = activations.first { $0.status == .active }
    }

    // MARK: - Beacon Scanning

    /// Attempt to detect a venue beacon within a short window.
    /// Returns a `BeaconReading` if found, or `nil` on timeout / unavailability.
    private func scanForBeacon(event: Event) async -> BeaconReading? {
        guard let venue = await findVenue(for: event) else { return nil }
        guard let beaconUUID = venue.beaconUUID else { return nil }

        await locationService.startBeaconRanging(uuid: beaconUUID)
        defer {
            Task { await locationService.stopBeaconRanging() }
        }

        // Wait up to 5 seconds for a beacon hit.
        // In production this streams from an AsyncSequence on the location service;
        // here we simulate a short dwell.
        try? await Task.sleep(for: .seconds(3))
        return nil // Placeholder; real implementation subscribes to beacon events.
    }

    private func findVenue(for event: Event) async -> Venue? {
        // Resolve venue from the school data associated with the event.
        // Simplified: return nil if unavailable; the check-in still proceeds GPS-only.
        return nil
    }
}
