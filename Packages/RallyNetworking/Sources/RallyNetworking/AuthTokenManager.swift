import Foundation
import OSLog

/// Manages authentication tokens using the iOS Keychain.
///
/// Tokens are stored with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`,
/// meaning they cannot be backed up or transferred to another device.
/// All read/write operations are synchronous Keychain calls wrapped in
/// an actor to guarantee thread safety under strict concurrency.
///
/// Sensitive token values are logged with `privacy: .private` so they
/// are redacted in production log output.
public actor AuthTokenManager {

    // MARK: - Properties

    private static let logger = Logger(
        subsystem: "app.rally.networking",
        category: "AuthTokenManager"
    )

    private let serviceName: String
    private let accessGroup: String?

    /// Cached in-memory copies to avoid hitting Keychain on every request.
    private var cachedAccessToken: String?
    private var cachedRefreshToken: String?
    private var cachedExpirationDate: Date?

    // MARK: - Keychain Item Keys

    private enum Key {
        static let accessToken = "rally_access_token"
        static let refreshToken = "rally_refresh_token"
        static let expirationDate = "rally_token_expiration"
    }

    // MARK: - Initialization

    /// Creates a new token manager.
    ///
    /// - Parameters:
    ///   - serviceName: The Keychain service name. Defaults to the app
    ///     bundle identifier prefix.
    ///   - accessGroup: An optional Keychain access group for sharing
    ///     tokens across app extensions.
    public init(
        serviceName: String = "app.rally.auth",
        accessGroup: String? = nil
    ) {
        self.serviceName = serviceName
        self.accessGroup = accessGroup

        // Warm the in-memory cache from Keychain
        self.cachedAccessToken = Self.readKeychain(
            key: Key.accessToken,
            service: serviceName,
            accessGroup: accessGroup
        )
        self.cachedRefreshToken = Self.readKeychain(
            key: Key.refreshToken,
            service: serviceName,
            accessGroup: accessGroup
        )
        if let expirationString = Self.readKeychain(
            key: Key.expirationDate,
            service: serviceName,
            accessGroup: accessGroup
        ), let interval = TimeInterval(expirationString) {
            self.cachedExpirationDate = Date(timeIntervalSince1970: interval)
        }

        Self.logger.debug("AuthTokenManager initialized; token present: \(self.cachedAccessToken != nil)")
    }

    // MARK: - Public API

    /// The current access token, or `nil` if the user is not authenticated.
    public var accessToken: String? {
        cachedAccessToken
    }

    /// The current refresh token, or `nil` if unavailable.
    public var refreshToken: String? {
        cachedRefreshToken
    }

    /// Whether the stored access token has expired based on the
    /// persisted expiration date.
    public var isAccessTokenExpired: Bool {
        guard let expiration = cachedExpirationDate else { return true }
        // Consider expired 60 seconds early to allow for clock skew and
        // network latency.
        return Date.now >= expiration.addingTimeInterval(-60)
    }

    /// Whether the user has any stored credentials (even if expired).
    public var hasCredentials: Bool {
        cachedAccessToken != nil && cachedRefreshToken != nil
    }

    /// Stores a new token pair received from the auth or refresh endpoint.
    ///
    /// - Parameters:
    ///   - accessToken: The new access token.
    ///   - refreshToken: The new refresh token.
    ///   - expiresIn: The token lifetime in seconds from now.
    public func store(
        accessToken: String,
        refreshToken: String,
        expiresIn: TimeInterval
    ) {
        Self.logger.debug(
            "Storing tokens — access: \(accessToken, privacy: .private), refresh: \(refreshToken, privacy: .private), expiresIn: \(expiresIn)s"
        )

        let expirationDate = Date.now.addingTimeInterval(expiresIn)

        // Persist to Keychain
        Self.writeKeychain(
            key: Key.accessToken,
            value: accessToken,
            service: serviceName,
            accessGroup: accessGroup
        )
        Self.writeKeychain(
            key: Key.refreshToken,
            value: refreshToken,
            service: serviceName,
            accessGroup: accessGroup
        )
        Self.writeKeychain(
            key: Key.expirationDate,
            value: String(expirationDate.timeIntervalSince1970),
            service: serviceName,
            accessGroup: accessGroup
        )

        // Update in-memory cache
        cachedAccessToken = accessToken
        cachedRefreshToken = refreshToken
        cachedExpirationDate = expirationDate
    }

    /// Removes all stored tokens. Called on sign-out.
    public func clear() {
        Self.logger.info("Clearing all stored tokens")

        Self.deleteKeychain(key: Key.accessToken, service: serviceName, accessGroup: accessGroup)
        Self.deleteKeychain(key: Key.refreshToken, service: serviceName, accessGroup: accessGroup)
        Self.deleteKeychain(key: Key.expirationDate, service: serviceName, accessGroup: accessGroup)

        cachedAccessToken = nil
        cachedRefreshToken = nil
        cachedExpirationDate = nil
    }

    // MARK: - Keychain Helpers

    private static func baseQuery(
        key: String,
        service: String,
        accessGroup: String?
    ) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        if let accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        return query
    }

    /// Reads a UTF-8 string from the Keychain. Returns `nil` when the
    /// item does not exist.
    private static func readKeychain(
        key: String,
        service: String,
        accessGroup: String?
    ) -> String? {
        var query = baseQuery(key: key, service: service, accessGroup: accessGroup)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            if status != errSecItemNotFound {
                logger.error("Keychain read failed for \(key): OSStatus \(status)")
            }
            return nil
        }
        return string
    }

    /// Writes (or updates) a UTF-8 string in the Keychain.
    @discardableResult
    private static func writeKeychain(
        key: String,
        value: String,
        service: String,
        accessGroup: String?
    ) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Try to update first — cheaper than delete + add
        let query = baseQuery(key: key, service: service, accessGroup: accessGroup)
        let attributes: [String: Any] = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecSuccess {
            return true
        }

        if updateStatus == errSecItemNotFound {
            // Item does not exist yet; add it
            var addQuery = query
            addQuery[kSecValueData as String] = data
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            if addStatus != errSecSuccess {
                logger.error("Keychain add failed for \(key): OSStatus \(addStatus)")
                return false
            }
            return true
        }

        logger.error("Keychain update failed for \(key): OSStatus \(updateStatus)")
        return false
    }

    /// Removes a single item from the Keychain.
    @discardableResult
    private static func deleteKeychain(
        key: String,
        service: String,
        accessGroup: String?
    ) -> Bool {
        let query = baseQuery(key: key, service: service, accessGroup: accessGroup)
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            logger.error("Keychain delete failed for \(key): OSStatus \(status)")
            return false
        }
        return true
    }
}
