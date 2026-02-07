import AuthenticationServices
import Foundation
import os
import RallyCore
import RallyNetworking

// MARK: - AuthState

/// Represents the current authentication lifecycle state.
public enum AuthState: Sendable, Equatable {
    /// No credentials present; user needs to sign in.
    case unauthenticated
    /// Actively checking stored credentials at launch.
    case restoringSession
    /// User is authenticated and has a valid session.
    case authenticated(UserProfile)
    /// First launch -- user needs to complete onboarding.
    case onboarding
}

// MARK: - OnboardingStep

/// Steps in the first-launch onboarding flow.
public enum OnboardingStep: Int, CaseIterable, Sendable, Comparable {
    case welcome = 0
    case schoolSelection = 1
    case notificationPermission = 2
    case locationPermission = 3

    public static func < (lhs: OnboardingStep, rhs: OnboardingStep) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

// MARK: - AuthViewModel

/// View model that drives the entire authentication and onboarding UI.
///
/// Manages sign-in state, coordinates Sign in with Apple, handles session
/// restoration at launch, and tracks onboarding progress.
@MainActor
@Observable
public final class AuthViewModel {

    // MARK: - Published State

    /// The current authentication state observed by the view layer.
    public private(set) var authState: AuthState = .restoringSession

    /// The current step in the onboarding flow.
    public var onboardingStep: OnboardingStep = .welcome

    /// Non-nil when an error should be presented to the user.
    public var errorMessage: String?

    /// Whether a sign-in request is currently in flight.
    public private(set) var isLoading = false

    /// The school selected during onboarding before it is persisted.
    public var selectedSchool: School?

    // MARK: - Dependencies

    private let authService: AuthService
    private let keychain: KeychainService
    private let logger = Logger(subsystem: "com.rally.auth", category: "AuthViewModel")

    // MARK: - Constants

    private static let hasCompletedOnboardingKey = "com.rally.hasCompletedOnboarding"

    // MARK: - Initialization

    /// Creates a new AuthViewModel.
    /// - Parameters:
    ///   - authService: The authentication service to use.
    ///   - keychain: The Keychain service for credential checks.
    public init(
        authService: AuthService = AuthService(),
        keychain: KeychainService = KeychainService()
    ) {
        self.authService = authService
        self.keychain = keychain
    }

    // MARK: - Lifecycle

    /// Called at app launch to determine the initial auth state.
    ///
    /// Checks whether onboarding has been completed. If yes, attempts to
    /// restore the session from the Keychain. Otherwise, enters the
    /// onboarding flow.
    public func initialize() async {
        let hasCompletedOnboarding = UserDefaults.standard.bool(
            forKey: Self.hasCompletedOnboardingKey
        )

        guard hasCompletedOnboarding else {
            authState = .onboarding
            return
        }

        authState = .restoringSession

        if let profile = await authService.restoreSession() {
            authState = .authenticated(profile)
        } else {
            authState = .unauthenticated
        }
    }

    // MARK: - Sign in with Apple

    /// Handles the result of an `ASAuthorizationController` request.
    ///
    /// Extracts the Apple ID credential, sends it to the Rally API, and
    /// transitions to the authenticated state on success.
    ///
    /// - Parameter result: The authorization result from `SignInWithAppleButton`.
    public func handleSignInWithApple(result: Result<ASAuthorization, Error>) async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        switch result {
        case .success(let authorization):
            guard let appleCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                errorMessage = "Unexpected credential type received from Apple."
                logger.error("Sign in with Apple returned non-Apple credential type")
                return
            }

            guard let identityTokenData = appleCredential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                errorMessage = "Could not read identity token from Apple."
                logger.error("Missing identity token in Apple credential")
                return
            }

            guard let authorizationCodeData = appleCredential.authorizationCode,
                  let authorizationCode = String(data: authorizationCodeData, encoding: .utf8) else {
                errorMessage = "Could not read authorization code from Apple."
                logger.error("Missing authorization code in Apple credential")
                return
            }

            // Build the full name from Apple's components if provided.
            var fullName: String?
            if let nameComponents = appleCredential.fullName {
                let formatter = PersonNameComponentsFormatter()
                let formatted = formatter.string(from: nameComponents)
                if !formatted.isEmpty {
                    fullName = formatted
                }
            }

            let request = AppleAuthRequest(
                identityToken: identityToken,
                authorizationCode: authorizationCode,
                fullName: fullName,
                email: appleCredential.email
            )

            do {
                let authResponse = try await authService.signInWithApple(request: request)
                authState = .authenticated(authResponse.user)
                logger.info("Sign in with Apple succeeded for user \(authResponse.user.id)")
            } catch let error as APIError {
                errorMessage = error.localizedDescription
                logger.error("API error during sign in: \(error.localizedDescription)")
            } catch {
                errorMessage = "Sign in failed. Please try again."
                logger.error("Unexpected error during sign in: \(error.localizedDescription)")
            }

        case .failure(let error):
            // ASAuthorizationError.canceled is expected when the user dismisses the sheet.
            if let authError = error as? ASAuthorizationError,
               authError.code == .canceled {
                logger.info("User cancelled Sign in with Apple")
                return
            }
            errorMessage = "Sign in with Apple failed. Please try again."
            logger.error("Sign in with Apple failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Sign Out

    /// Signs the user out, clears all tokens, and returns to the
    /// unauthenticated state.
    public func signOut() async {
        do {
            try await authService.signOut()
            authState = .unauthenticated
            logger.info("User signed out")
        } catch {
            errorMessage = "Failed to sign out. Please try again."
            logger.error("Sign out failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Biometric Auth

    /// Triggers biometric authentication for a sensitive action.
    /// - Parameter reason: Human-readable reason shown in the system prompt.
    /// - Returns: `true` if the user verified their identity successfully.
    public func requireBiometricAuth(
        reason: String = "Verify your identity to continue"
    ) async -> Bool {
        do {
            return try await authService.authenticateWithBiometrics(reason: reason)
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Onboarding

    /// Advances to the next onboarding step, or completes onboarding
    /// and transitions to the sign-in screen.
    public func advanceOnboarding() {
        guard let nextStep = OnboardingStep(rawValue: onboardingStep.rawValue + 1) else {
            completeOnboarding()
            return
        }
        onboardingStep = nextStep
    }

    /// Marks onboarding as complete and transitions to unauthenticated
    /// (sign-in) state.
    public func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: Self.hasCompletedOnboardingKey)
        authState = .unauthenticated
    }

    /// Returns to the previous onboarding step if possible.
    public func goBackOnboarding() {
        guard let previousStep = OnboardingStep(rawValue: onboardingStep.rawValue - 1) else {
            return
        }
        onboardingStep = previousStep
    }

    // MARK: - Token Access

    /// Provides a valid access token for making authenticated API requests.
    /// Automatically refreshes the token if it has expired.
    ///
    /// - Returns: A valid bearer token string.
    public func accessToken() async throws -> String {
        try await authService.validAccessToken()
    }
}
