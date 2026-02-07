import Foundation
import OSLog
import RallyCore

/// Central actor-based API client for all Rally server communication.
///
/// `APIClient` owns the shared `URLSession`, JSON coders, retry policy,
/// and auth-interceptor logic. It is designed as an actor so that
/// concurrent callers safely share the single token-refresh flow
/// without data races.
///
/// ## Key Behaviours
///
/// - **Auth interceptor**: Injects `Bearer` token from ``AuthTokenManager``.
///   On a 401 response the client automatically refreshes the token and
///   replays the original request. Concurrent callers queue behind the
///   in-flight refresh rather than triggering duplicate refreshes.
///
/// - **Retry policy**: Exponential backoff at 1 s, 2 s, 4 s with a max
///   of 3 attempts. Only 5xx, 401, 429, timeout, and connectivity errors
///   are retried; other 4xx errors fail immediately.
///
/// - **Logging**: Uses `OSLog` with `.debug` for outgoing requests and
///   `.error` for failures. Auth tokens are tagged `privacy: .private`.
public actor APIClient {

    // MARK: - Configuration

    /// Configuration for the API client.
    public struct Configuration: Sendable {
        /// Base URL for all API requests.
        public let baseURL: URL
        /// Maximum number of retry attempts for retryable errors.
        public let maxRetries: Int
        /// Base delay for exponential backoff (doubled on each retry).
        public let retryBaseDelay: TimeInterval
        /// Request timeout interval in seconds.
        public let timeoutInterval: TimeInterval

        /// Creates a new configuration.
        ///
        /// - Parameters:
        ///   - baseURL: The API base URL.
        ///   - maxRetries: Maximum retry count. Defaults to 3.
        ///   - retryBaseDelay: Initial backoff delay. Defaults to 1.0 s.
        ///   - timeoutInterval: URLRequest timeout. Defaults to 30 s.
        public init(
            baseURL: URL,
            maxRetries: Int = 3,
            retryBaseDelay: TimeInterval = 1.0,
            timeoutInterval: TimeInterval = 30
        ) {
            self.baseURL = baseURL
            self.maxRetries = maxRetries
            self.retryBaseDelay = retryBaseDelay
            self.timeoutInterval = timeoutInterval
        }
    }

    // MARK: - Properties

    private static let logger = Logger(
        subsystem: "app.rally.networking",
        category: "APIClient"
    )

    private let session: URLSession
    private let configuration: Configuration
    private let tokenManager: AuthTokenManager
    private let networkMonitor: NetworkMonitor

    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    /// Guards the token-refresh flow so that concurrent 401 responses
    /// coalesce into a single refresh call.
    private var activeRefreshTask: Task<TokenPair, Error>?

    // MARK: - Initialization

    /// Creates a new API client.
    ///
    /// - Parameters:
    ///   - configuration: Client configuration including base URL and
    ///     retry policy.
    ///   - tokenManager: The ``AuthTokenManager`` for credential storage.
    ///   - networkMonitor: The ``NetworkMonitor`` for connectivity checks.
    ///   - urlSession: An optional custom `URLSession`. When `nil` a
    ///     default ephemeral session is created.
    public init(
        configuration: Configuration,
        tokenManager: AuthTokenManager,
        networkMonitor: NetworkMonitor,
        urlSession: URLSession? = nil
    ) {
        self.configuration = configuration
        self.tokenManager = tokenManager
        self.networkMonitor = networkMonitor

        // Session
        if let urlSession {
            self.session = urlSession
        } else {
            let sessionConfig = URLSessionConfiguration.ephemeral
            sessionConfig.timeoutIntervalForRequest = configuration.timeoutInterval
            sessionConfig.timeoutIntervalForResource = configuration.timeoutInterval * 3
            sessionConfig.waitsForConnectivity = false
            sessionConfig.httpAdditionalHeaders = [
                "Accept": "application/json",
                "X-Rally-Platform": "ios"
            ]
            self.session = URLSession(configuration: sessionConfig)
        }

        // Encoder
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        enc.keyEncodingStrategy = .convertToSnakeCase
        self.encoder = enc

        // Decoder
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        dec.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = dec
    }

    // MARK: - Convenience Init

    /// Creates a client with defaults derived from ``AppEnvironment``.
    public init(
        tokenManager: AuthTokenManager,
        networkMonitor: NetworkMonitor
    ) {
        let env = AppEnvironment.current
        self.init(
            configuration: Configuration(baseURL: env.apiBaseURL),
            tokenManager: tokenManager,
            networkMonitor: networkMonitor
        )
    }

    // MARK: - Public API

    /// Sends a typed ``Request`` and decodes the response.
    ///
    /// This is the primary entry point for all API calls. It handles
    /// connectivity checks, auth injection, retry with exponential
    /// backoff, and automatic 401 token refresh.
    ///
    /// - Parameter request: The request to send.
    /// - Returns: The decoded response of type `T`.
    /// - Throws: ``APIError`` on failure.
    public func send<T: Decodable & Sendable>(
        _ request: Request<T>
    ) async throws -> T {
        // Pre-flight connectivity check
        let connected = await networkMonitor.isConnected
        guard connected else {
            Self.logger.error("Request to \(request.path) aborted — network unavailable")
            throw APIError.networkUnavailable
        }

        return try await performWithRetry(request: request, attempt: 0)
    }

    /// Sends a request that returns no meaningful body (e.g., 204).
    ///
    /// - Parameter request: A `Request<EmptyResponse>` to execute.
    /// - Throws: ``APIError`` on failure.
    public func send(_ request: Request<EmptyResponse>) async throws {
        let _: EmptyResponse = try await send(request)
    }

    // MARK: - Retry Loop

    private func performWithRetry<T: Decodable & Sendable>(
        request: Request<T>,
        attempt: Int
    ) async throws -> T {
        do {
            return try await performRequest(request)
        } catch let error as APIError {
            // Check for cancellation before retrying
            try Task.checkCancellation()

            if error == .unauthorized && request.requiresAuth {
                // Attempt token refresh and replay
                Self.logger.info("Received 401 for \(request.path) — attempting token refresh")
                try await refreshTokenIfNeeded()
                return try await performRequest(request)
            }

            guard error.isRetryable, attempt < configuration.maxRetries else {
                throw error
            }

            let delay = retryDelay(for: attempt, error: error)
            Self.logger.info(
                "Retrying \(request.method.rawValue) \(request.path) — attempt \(attempt + 1)/\(self.configuration.maxRetries) after \(delay)s"
            )
            try await Task.sleep(for: .seconds(delay))

            return try await performWithRetry(request: request, attempt: attempt + 1)
        } catch is CancellationError {
            throw APIError.cancelled
        } catch {
            throw APIError.networkUnavailable
        }
    }

    // MARK: - Single Request Execution

    private func performRequest<T: Decodable & Sendable>(
        _ request: Request<T>
    ) async throws -> T {
        // Resolve access token
        let accessToken: String?
        if request.requiresAuth {
            accessToken = await tokenManager.accessToken
        } else {
            accessToken = nil
        }

        let urlRequest = try request.urlRequest(
            baseURL: configuration.baseURL,
            encoder: encoder,
            accessToken: accessToken
        )

        Self.logger.debug(
            "→ \(request.method.rawValue) \(urlRequest.url?.absoluteString ?? "nil") [auth: \(request.requiresAuth ? "Bearer \(accessToken ?? "nil", privacy: .private)" : "none")]"
        )

        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let urlError as URLError {
            switch urlError.code {
            case .timedOut:
                Self.logger.error("Request timed out: \(request.path)")
                throw APIError.timeout
            case .cancelled:
                throw APIError.cancelled
            case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed:
                Self.logger.error("Network unavailable: \(request.path)")
                throw APIError.networkUnavailable
            default:
                Self.logger.error("URLError \(urlError.code.rawValue): \(request.path)")
                throw APIError.networkUnavailable
            }
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            Self.logger.error("Non-HTTP response for \(request.path)")
            throw APIError.serverError(0)
        }

        Self.logger.debug(
            "← \(httpResponse.statusCode) \(request.path) (\(data.count) bytes)"
        )

        // Map HTTP status to errors
        switch httpResponse.statusCode {
        case 200 ..< 300:
            break
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 429:
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap(TimeInterval.init)
            throw APIError.rateLimited(retryAfter: retryAfter)
        case 400 ..< 500:
            throw APIError.serverError(httpResponse.statusCode)
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }

        // Decode
        do {
            let decoded = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            Self.logger.error(
                "Decoding failed for \(request.path): \(error.localizedDescription)"
            )
            throw APIError.decodingFailed(error)
        }
    }

    // MARK: - Token Refresh

    /// Coalesces concurrent refresh requests into a single network call.
    /// Callers that arrive while a refresh is in-flight suspend and
    /// receive the same result.
    private func refreshTokenIfNeeded() async throws {
        if let existingTask = activeRefreshTask {
            // Wait on the in-flight refresh
            _ = try await existingTask.value
            return
        }

        let task = Task<TokenPair, Error> { [weak self] in
            guard let self else { throw APIError.unauthorized }

            guard let refreshToken = await self.tokenManager.refreshToken else {
                Self.logger.error("No refresh token available — user must re-authenticate")
                throw APIError.unauthorized
            }

            Self.logger.info("Refreshing access token")

            let request = Request<TokenPair>(
                method: .post,
                path: "/auth/refresh",
                body: ["refreshToken": refreshToken],
                requiresAuth: false
            )

            let urlRequest = try request.urlRequest(
                baseURL: self.configuration.baseURL,
                encoder: self.encoder
            )

            let (data, response) = try await self.session.data(for: urlRequest)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200 ..< 300).contains(httpResponse.statusCode) else {
                Self.logger.error("Token refresh failed — clearing credentials")
                await self.tokenManager.clear()
                throw APIError.unauthorized
            }

            let tokenPair = try self.decoder.decode(TokenPair.self, from: data)

            await self.tokenManager.store(
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: tokenPair.expiresIn
            )

            Self.logger.info("Token refresh succeeded")
            return tokenPair
        }

        activeRefreshTask = task

        do {
            _ = try await task.value
            activeRefreshTask = nil
        } catch {
            activeRefreshTask = nil
            throw error
        }
    }

    // MARK: - Retry Delay

    /// Calculates the delay for a given retry attempt using exponential
    /// backoff: base * 2^attempt.  For rate-limit errors, honours the
    /// server's `Retry-After` header when available.
    private func retryDelay(for attempt: Int, error: APIError) -> TimeInterval {
        if case .rateLimited(let retryAfter) = error, let retryAfter {
            return retryAfter
        }
        // 1s, 2s, 4s …
        let exponential = configuration.retryBaseDelay * pow(2.0, Double(attempt))
        // Add jitter: ±25 %
        let jitter = exponential * Double.random(in: -0.25 ... 0.25)
        return exponential + jitter
    }
}

// MARK: - EmptyResponse

/// Placeholder type for endpoints that return no body (e.g., HTTP 204).
public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}
