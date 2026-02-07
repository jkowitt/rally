import Foundation
import Security

// MARK: - KeychainService

/// Thread-safe wrapper around the iOS Keychain for secure token storage.
///
/// All items are stored with `kSecAttrAccessible: .whenUnlockedThisDeviceOnly`
/// to prevent migration to new devices or exposure while the device is locked.
public final class KeychainService: Sendable {

    // MARK: - Types

    /// Keys used to identify stored credentials in the Keychain.
    public enum Key: String, Sendable {
        case accessToken = "com.rally.auth.accessToken"
        case refreshToken = "com.rally.auth.refreshToken"
        case tokenExpiration = "com.rally.auth.tokenExpiration"
        case userID = "com.rally.auth.userID"
    }

    /// Errors specific to Keychain operations.
    public enum KeychainError: Error, LocalizedError, Sendable {
        case saveFailed(OSStatus)
        case readFailed(OSStatus)
        case deleteFailed(OSStatus)
        case dataConversionFailed
        case unexpectedItemData

        public var errorDescription: String? {
            switch self {
            case .saveFailed(let status):
                return "Keychain save failed with status \(status)."
            case .readFailed(let status):
                return "Keychain read failed with status \(status)."
            case .deleteFailed(let status):
                return "Keychain delete failed with status \(status)."
            case .dataConversionFailed:
                return "Failed to convert data for Keychain storage."
            case .unexpectedItemData:
                return "Unexpected data format found in Keychain."
            }
        }
    }

    // MARK: - Properties

    private let serviceName: String

    // MARK: - Initialization

    /// Creates a new KeychainService instance.
    /// - Parameter serviceName: The service identifier used for Keychain queries.
    ///   Defaults to the app bundle identifier or a Rally fallback.
    public init(serviceName: String = Bundle.main.bundleIdentifier ?? "com.rally.app") {
        self.serviceName = serviceName
    }

    // MARK: - Public API

    /// Saves a string value to the Keychain under the specified key.
    /// If a value already exists for the key, it is updated in place.
    /// - Parameters:
    ///   - value: The string to store securely.
    ///   - key: The Keychain key to associate with the value.
    public func save(_ value: String, for key: Key) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.dataConversionFailed
        }
        try save(data: data, for: key)
    }

    /// Saves raw data to the Keychain under the specified key.
    /// If a value already exists for the key, it is updated in place.
    /// - Parameters:
    ///   - data: The data to store securely.
    ///   - key: The Keychain key to associate with the data.
    public func save(data: Data, for key: Key) throws {
        let query = baseQuery(for: key)

        // Attempt to delete any existing item first.
        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    /// Retrieves a string value from the Keychain for the specified key.
    /// - Parameter key: The Keychain key to look up.
    /// - Returns: The stored string, or `nil` if no value exists.
    public func read(key: Key) throws -> String? {
        guard let data = try readData(key: key) else {
            return nil
        }
        guard let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedItemData
        }
        return string
    }

    /// Retrieves raw data from the Keychain for the specified key.
    /// - Parameter key: The Keychain key to look up.
    /// - Returns: The stored data, or `nil` if no value exists.
    public func readData(key: Key) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            guard let data = result as? Data else {
                throw KeychainError.unexpectedItemData
            }
            return data
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError.readFailed(status)
        }
    }

    /// Deletes the value associated with the specified key from the Keychain.
    /// - Parameter key: The Keychain key to remove.
    public func delete(key: Key) throws {
        let query = baseQuery(for: key)
        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }

    /// Removes all Rally authentication tokens from the Keychain.
    /// Called during sign-out to clear all stored credentials.
    public func deleteAll() throws {
        for key in [Key.accessToken, .refreshToken, .tokenExpiration, .userID] {
            try delete(key: key)
        }
    }

    /// Checks whether a value exists in the Keychain for the given key
    /// without actually reading the data.
    /// - Parameter key: The Keychain key to check.
    /// - Returns: `true` if a value exists for this key.
    public func contains(key: Key) -> Bool {
        let query = baseQuery(for: key)
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    // MARK: - Token Convenience

    /// Stores a complete token pair from an authentication response.
    /// - Parameter tokenPair: The access/refresh token pair to persist.
    public func storeTokens(_ tokenPair: TokenPair) throws {
        try save(tokenPair.accessToken, for: .accessToken)
        try save(tokenPair.refreshToken, for: .refreshToken)

        let expirationDate = Date.now.addingTimeInterval(tokenPair.expiresIn)
        let expirationString = ISO8601DateFormatter().string(from: expirationDate)
        try save(expirationString, for: .tokenExpiration)
    }

    /// Retrieves the stored access token if it has not expired.
    /// - Returns: The valid access token, or `nil` if missing or expired.
    public func validAccessToken() throws -> String? {
        guard let token = try read(key: .accessToken),
              let expirationString = try read(key: .tokenExpiration),
              let expirationDate = ISO8601DateFormatter().date(from: expirationString) else {
            return nil
        }

        // Include a 60-second buffer to avoid using tokens that are about to expire.
        guard expirationDate > Date.now.addingTimeInterval(60) else {
            return nil
        }

        return token
    }

    /// Whether the stored access token has expired or is about to expire.
    public var isTokenExpired: Bool {
        guard let token = try? validAccessToken() else {
            return true
        }
        return token.isEmpty
    }

    // MARK: - Private Helpers

    private func baseQuery(for key: Key) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue
        ]
    }
}

// MARK: - TokenPair import

import RallyCore
