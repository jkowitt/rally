import Foundation

/// Represents a leaderboard entry for gameday rankings.
public struct LeaderboardEntry: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let userID: String
    public let displayName: String
    public let avatarURL: URL?
    public let score: Int
    public let rank: Int
    public let tier: Tier

    public init(
        id: String,
        userID: String,
        displayName: String,
        avatarURL: URL? = nil,
        score: Int,
        rank: Int,
        tier: Tier = .rookie
    ) {
        self.id = id
        self.userID = userID
        self.displayName = displayName
        self.avatarURL = avatarURL
        self.score = score
        self.rank = rank
        self.tier = tier
    }
}

/// Represents a complete leaderboard with metadata.
public struct Leaderboard: Codable, Sendable {
    public let eventID: String
    public let entries: [LeaderboardEntry]
    public let currentUserRank: Int?
    public let totalParticipants: Int
    public let updatedAt: Date

    public init(
        eventID: String,
        entries: [LeaderboardEntry],
        currentUserRank: Int? = nil,
        totalParticipants: Int = 0,
        updatedAt: Date = .now
    ) {
        self.eventID = eventID
        self.entries = entries
        self.currentUserRank = currentUserRank
        self.totalParticipants = totalParticipants
        self.updatedAt = updatedAt
    }
}
