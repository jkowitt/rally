import SwiftUI
import RallyCore

/// Dependency injection container that initializes and provides all app services.
@MainActor
@Observable
final class AppContainer {
    // MARK: - Auth State
    enum AuthState: Sendable {
        case unknown
        case unauthenticated
        case authenticated(UserProfile)
        case onboarding
    }

    private(set) var authState: AuthState = .unknown
    private(set) var selectedSchool: School?
    private(set) var isLoading = true

    init() {}

    // MARK: - Bootstrap

    func bootstrap() async {
        isLoading = true
        defer { isLoading = false }

        // Check for stored auth token
        let hasToken = loadStoredToken()

        if hasToken {
            do {
                let profile = try await fetchUserProfile()
                authState = .authenticated(profile)
                if let schoolID = profile.schoolID {
                    await loadSchool(id: schoolID)
                }
            } catch {
                authState = .unauthenticated
            }
        } else {
            authState = .unauthenticated
        }
    }

    // MARK: - Auth Actions

    func didAuthenticate(user: UserProfile) {
        authState = .authenticated(user)
    }

    func didSelectSchool(_ school: School) {
        selectedSchool = school
    }

    func signOut() {
        authState = .unauthenticated
        selectedSchool = nil
        clearStoredToken()
    }

    func beginOnboarding() {
        authState = .onboarding
    }

    func completeOnboarding(user: UserProfile) {
        authState = .authenticated(user)
    }

    // MARK: - Private Helpers

    private func loadStoredToken() -> Bool {
        // Token retrieval from Keychain handled by AuthTokenManager
        // Placeholder: check if keychain has a stored access token
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.vanwagner.rally.auth",
            kSecAttrAccount as String: "access_token",
            kSecReturnData as String: false,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    private func clearStoredToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.vanwagner.rally.auth"
        ]
        SecItemDelete(query as CFDictionary)
    }

    private func fetchUserProfile() async throws -> UserProfile {
        // Will be replaced with actual API call via APIClient
        throw URLError(.userAuthenticationRequired)
    }

    private func loadSchool(id: String) async {
        // Will be replaced with actual API call
    }
}
