import Foundation

/// Protocol for authentication service.
public protocol AuthServiceProtocol: Sendable {
    var isAuthenticated: Bool { get async }
    var currentUser: UserProfile? { get async }
    func signInWithApple(request: AppleAuthRequest) async throws -> AuthResponse
    func refreshToken() async throws -> TokenPair
    func signOut() async throws
}

/// Protocol for location and venue detection.
public protocol LocationServiceProtocol: Sendable {
    func requestPermission() async -> LocationPermissionStatus
    func startMonitoringVenue(_ venue: Venue) async
    func stopMonitoringVenue(_ venue: Venue) async
    func startBeaconRanging(uuid: String) async
    func stopBeaconRanging() async
    func currentLocation() async throws -> (latitude: Double, longitude: Double)
}

public enum LocationPermissionStatus: Sendable {
    case authorized
    case authorizedWhenInUse
    case denied
    case notDetermined
    case restricted
}

/// Protocol for analytics event tracking.
public protocol AnalyticsServiceProtocol: Sendable {
    func track(_ event: AnalyticsEvent) async
    func setUserProperties(_ properties: [String: String]) async
    func identify(userID: String) async
    func reset() async
}

public struct AnalyticsEvent: Sendable {
    public let name: String
    public let properties: [String: String]
    public let timestamp: Date

    public init(name: String, properties: [String: String] = [:], timestamp: Date = .now) {
        self.name = name
        self.properties = properties
        self.timestamp = timestamp
    }
}

/// Protocol for push notification management.
public protocol NotificationServiceProtocol: Sendable {
    func requestPermission() async throws -> Bool
    func registerForRemoteNotifications() async
    func handleNotification(userInfo: [AnyHashable: Any]) async
    func updatePushToken(_ token: Data) async
}

/// Protocol for sponsor impression tracking.
public protocol SponsorServiceProtocol: Sendable {
    func trackImpression(_ impression: SponsorImpression) async
    func fetchSponsors(schoolID: String) async throws -> [Sponsor]
}

/// Protocol for connectivity monitoring.
public protocol ConnectivityServiceProtocol: Sendable {
    var isConnected: Bool { get async }
    func startMonitoring() async
    func stopMonitoring() async
}
