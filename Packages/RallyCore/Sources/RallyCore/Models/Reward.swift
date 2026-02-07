import Foundation

/// Represents a redeemable reward in the loyalty catalog.
public struct Reward: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let schoolID: String
    public let title: String
    public let description: String
    public let pointsCost: Int
    public let imageURL: URL?
    public let category: RewardCategory
    public let minimumTier: Tier
    public let sponsorID: String?
    public let inventory: Int?
    public let expiresAt: Date?
    public let isActive: Bool

    public init(
        id: String,
        schoolID: String,
        title: String,
        description: String,
        pointsCost: Int,
        imageURL: URL? = nil,
        category: RewardCategory = .merchandise,
        minimumTier: Tier = .rookie,
        sponsorID: String? = nil,
        inventory: Int? = nil,
        expiresAt: Date? = nil,
        isActive: Bool = true
    ) {
        self.id = id
        self.schoolID = schoolID
        self.title = title
        self.description = description
        self.pointsCost = pointsCost
        self.imageURL = imageURL
        self.category = category
        self.minimumTier = minimumTier
        self.sponsorID = sponsorID
        self.inventory = inventory
        self.expiresAt = expiresAt
        self.isActive = isActive
    }
}

public enum RewardCategory: String, Codable, Hashable, Sendable, CaseIterable {
    case merchandise
    case concessions
    case experiences
    case tickets
    case digital
    case partner
}

/// Represents a reward redemption transaction.
public struct Redemption: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let rewardID: String
    public let userID: String
    public let pointsSpent: Int
    public let redeemedAt: Date
    public let status: RedemptionStatus
    public let redemptionCode: String?
    public let expiresAt: Date?

    public init(
        id: String,
        rewardID: String,
        userID: String,
        pointsSpent: Int,
        redeemedAt: Date = .now,
        status: RedemptionStatus = .pending,
        redemptionCode: String? = nil,
        expiresAt: Date? = nil
    ) {
        self.id = id
        self.rewardID = rewardID
        self.userID = userID
        self.pointsSpent = pointsSpent
        self.redeemedAt = redeemedAt
        self.status = status
        self.redemptionCode = redemptionCode
        self.expiresAt = expiresAt
    }
}

public enum RedemptionStatus: String, Codable, Hashable, Sendable {
    case pending
    case confirmed
    case used
    case expired
    case cancelled
}
