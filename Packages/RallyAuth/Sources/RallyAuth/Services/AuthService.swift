import Foundation
import LocalAuthentication
import os
import RallyCore
import RallyNetworking

// MARK: - AuthService

/// Concrete implementation of ``AuthServiceProtocol`` that coordinates
/// Sign in with Apple authentication, Keychain token persistence,
/// automatic 401 token refresh with request queuing, and biometric
/// verification for sensitive actions.
public actor AuthService: AuthServiceProtocol {

    // MARK: - Dependencies

    private let keychain: KeychainService
    private let baseURL: URL
    private let urlSession: URLSession
    private let logger = Logger(subsystem: "com.rally.auth", category: "AuthService")

    // MARK: - State

    private var _currentUser: UserProfile?
    private var isRefreshing = false
    private var refreshContinuations: [CheckedContinuation<TokenPair, Error>] = []

    // MARK: - Initialization

    /// Creates a new AuthService.
    /// - Parameters:
    ///   - keychain: The Keychain service for token persistence.
    ///   - baseURL: The API base URL for auth endpoints.
    ///   - urlSession: The URLSession to use for network requests.
    public init(
        keychain: KeychainService = KeychainService(),
        baseURL: URL = AppEnvironment.current.apiBaseURL,
        urlSession: URLSession = .shared
    ) {
        self.keychain = keychain
        self.baseURL = baseURL
        self.urlSession = urlSession
    }

    // MARK: - AuthServiceProtocol

    public var isAuthenticated: Bool {
        do {
            return try keychain.validAccessToken() != nil
        } catch {
            logger.error("Failed to check authentication status: \(error.localizedDescription)")
            return false
        }
    }

    public var currentUser: UserProfile? {
        _currentUser
    }

    /// Authenticates the user with Sign in with Apple credentials.
    ///
    /// Sends the Apple identity token and authorization code to the Rally API,
    /// receives back an access/refresh token pair plus the user profile, and
    /// persists the tokens in the Keychain.
    ///
    /// - Parameter request: The Apple auth credentials.
    /// - Returns: The full authentication response including user profile.
    public func signInWithApple(request: AppleAuthRequest) async throws -> AuthResponse {
        let url = baseURL.appendingPathComponent("auth/apple")

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        urlRequest.httpBody = try encoder.encode(request)

        let (data, response) = try await urlSession.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.serverError(0)
        }

        switch httpResponse.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 429:
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap(TimeInterval.init)
            throw APIError.rateLimited(retryAfter: retryAfter)
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        let authResponse: AuthResponse
        do {
            authResponse = try decoder.decode(AuthResponse.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }

        // Persist tokens in the Keychain.
        let tokenPair = TokenPair(
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
            expiresIn: authResponse.expiresIn
        )
        try keychain.storeTokens(tokenPair)
        try keychain.save(authResponse.user.id, for: .userID)

        _currentUser = authResponse.user

        logger.info("Successfully authenticated user \(authResponse.user.id)")

        return authResponse
    }

    /// Refreshes the access token using the stored refresh token.
    ///
    /// If a refresh is already in progress, this method queues the caller and
    /// returns the same result once the in-flight refresh completes. This prevents
    /// multiple concurrent 401-triggered refresh requests from racing.
    ///
    /// - Returns: The new token pair.
    public func refreshToken() async throws -> TokenPair {
        // If a refresh is already in-flight, queue this caller.
        if isRefreshing {
            return try await withCheckedThrowingContinuation { continuation in
                refreshContinuations.append(continuation)
            }
        }

        isRefreshing = true

        do {
            let tokenPair = try await performTokenRefresh()
            isRefreshing = false

            // Resume all queued callers with the refreshed tokens.
            let queued = refreshContinuations
            refreshContinuations.removeAll()
            for continuation in queued {
                continuation.resume(returning: tokenPair)
            }

            return tokenPair
        } catch {
            isRefreshing = false

            // Resume all queued callers with the error.
            let queued = refreshContinuations
            refreshContinuations.removeAll()
            for continuation in queued {
                continuation.resume(throwing: error)
            }

            throw error
        }
    }

    /// Signs the user out by clearing all stored tokens and user state.
    public func signOut() async throws {
        try keychain.deleteAll()
        _currentUser = nil
        logger.info("User signed out successfully")
    }

    // MARK: - Biometric Authentication

    /// Prompts the user for biometric authentication (Face ID / Touch ID)
    /// before performing sensitive actions such as reward redemption.
    ///
    /// - Parameter reason: A human-readable explanation shown in the system prompt.
    /// - Returns: `true` if biometric verification succeeded.
    public nonisolated func authenticateWithBiometrics(
        reason: String = "Verify your identity to complete this action"
    ) async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        var authError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            if let error = authError {
                throw BiometricError.unavailable(error.localizedDescription)
            }
            throw BiometricError.unavailable("Biometric authentication is not available.")
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return success
        } catch {
            throw BiometricError.authenticationFailed(error.localizedDescription)
        }
    }

    // MARK: - Authorized Request Helper

    /// Returns the current valid access token, refreshing automatically if expired.
    /// Use this to attach the `Authorization` header to API requests.
    ///
    /// - Returns: A valid access token string.
    public func validAccessToken() async throws -> String {
        if let token = try keychain.validAccessToken() {
            return token
        }

        // Token expired or missing -- attempt refresh.
        let tokenPair = try await refreshToken()
        return tokenPair.accessToken
    }

    // MARK: - Session Restoration

    /// Attempts to restore the user session from stored Keychain credentials
    /// and fetches the current user profile from the API.
    ///
    /// Called at app launch to silently restore a previously authenticated session.
    ///
    /// - Returns: The restored user profile, or `nil` if no valid session exists.
    @discardableResult
    public func restoreSession() async -> UserProfile? {
        guard isAuthenticated else {
            return nil
        }

        do {
            let token = try await validAccessToken()
            let profile = try await fetchProfile(accessToken: token)
            _currentUser = profile
            logger.info("Session restored for user \(profile.id)")
            return profile
        } catch {
            logger.warning("Session restoration failed: \(error.localizedDescription)")
            try? await signOut()
            return nil
        }
    }

    // MARK: - Private Helpers

    private func performTokenRefresh() async throws -> TokenPair {
        guard let refreshTokenValue = try keychain.read(key: .refreshToken) else {
            throw APIError.unauthorized
        }

        let url = baseURL.appendingPathComponent("auth/refresh")

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["refresh_token": refreshTokenValue]
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await urlSession.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.serverError(0)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                // Refresh token is invalid -- force sign out.
                try? keychain.deleteAll()
                _currentUser = nil
                throw APIError.unauthorized
            }
            throw APIError.serverError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let tokenPair: TokenPair
        do {
            tokenPair = try decoder.decode(TokenPair.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }

        try keychain.storeTokens(tokenPair)

        logger.info("Access token refreshed successfully")

        return tokenPair
    }

    private func fetchProfile(accessToken: String) async throws -> UserProfile {
        let url = baseURL.appendingPathComponent("users/me")

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await urlSession.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(
                (response as? HTTPURLResponse)?.statusCode ?? 0
            )
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(UserProfile.self, from: data)
    }
}

// MARK: - BiometricError

/// Errors that can occur during biometric authentication.
public enum BiometricError: Error, LocalizedError, Sendable {
    case unavailable(String)
    case authenticationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .unavailable(let reason):
            return "Biometric authentication unavailable: \(reason)"
        case .authenticationFailed(let reason):
            return "Biometric authentication failed: \(reason)"
        }
    }
}
