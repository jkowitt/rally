import Foundation

/// Represents the authenticated user's profile.
public struct UserProfile: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let email: String?
    public let displayName: String
    public let avatarURL: URL?
    public let schoolID: String?
    public let tier: Tier
    public let pointsBalance: Int
    public let lifetimePoints: Int
    public let checkInCount: Int
    public let joinedAt: Date
    public let preferences: UserPreferences

    public init(
        id: String,
        email: String? = nil,
        displayName: String,
        avatarURL: URL? = nil,
        schoolID: String? = nil,
        tier: Tier = .rookie,
        pointsBalance: Int = 0,
        lifetimePoints: Int = 0,
        checkInCount: Int = 0,
        joinedAt: Date = .now,
        preferences: UserPreferences = UserPreferences()
    ) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.avatarURL = avatarURL
        self.schoolID = schoolID
        self.tier = tier
        self.pointsBalance = pointsBalance
        self.lifetimePoints = lifetimePoints
        self.checkInCount = checkInCount
        self.joinedAt = joinedAt
        self.preferences = preferences
    }
}

public struct UserPreferences: Codable, Hashable, Sendable {
    public var pushNotificationsEnabled: Bool
    public var gamedayAlertsEnabled: Bool
    public var sponsorOffersEnabled: Bool
    public var favoriteSports: [Sport]

    public init(
        pushNotificationsEnabled: Bool = true,
        gamedayAlertsEnabled: Bool = true,
        sponsorOffersEnabled: Bool = true,
        favoriteSports: [Sport] = []
    ) {
        self.pushNotificationsEnabled = pushNotificationsEnabled
        self.gamedayAlertsEnabled = gamedayAlertsEnabled
        self.sponsorOffersEnabled = sponsorOffersEnabled
        self.favoriteSports = favoriteSports
    }
}

/// Loyalty tiers with ascending order of engagement.
public enum Tier: String, Codable, Hashable, Sendable, CaseIterable, Comparable {
    case rookie = "Rookie"
    case starter = "Starter"
    case allStar = "All-Star"
    case mvp = "MVP"
    case hallOfFame = "Hall of Fame"

    public var minimumPoints: Int {
        switch self {
        case .rookie: return 0
        case .starter: return 500
        case .allStar: return 2_000
        case .mvp: return 5_000
        case .hallOfFame: return 15_000
        }
    }

    public var nextTier: Tier? {
        switch self {
        case .rookie: return .starter
        case .starter: return .allStar
        case .allStar: return .mvp
        case .mvp: return .hallOfFame
        case .hallOfFame: return nil
        }
    }

    public var sortOrder: Int {
        switch self {
        case .rookie: return 0
        case .starter: return 1
        case .allStar: return 2
        case .mvp: return 3
        case .hallOfFame: return 4
        }
    }

    public static func < (lhs: Tier, rhs: Tier) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}
