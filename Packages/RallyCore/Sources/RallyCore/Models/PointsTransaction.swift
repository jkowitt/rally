import Foundation

/// Represents a single points transaction in the loyalty ledger.
public struct PointsTransaction: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let userID: String
    public let amount: Int
    public let type: TransactionType
    public let source: TransactionSource
    public let description: String
    public let eventID: String?
    public let activationID: String?
    public let createdAt: Date
    public let isReconciled: Bool

    public init(
        id: String,
        userID: String,
        amount: Int,
        type: TransactionType,
        source: TransactionSource,
        description: String,
        eventID: String? = nil,
        activationID: String? = nil,
        createdAt: Date = .now,
        isReconciled: Bool = false
    ) {
        self.id = id
        self.userID = userID
        self.amount = amount
        self.type = type
        self.source = source
        self.description = description
        self.eventID = eventID
        self.activationID = activationID
        self.createdAt = createdAt
        self.isReconciled = isReconciled
    }
}

public enum TransactionType: String, Codable, Hashable, Sendable {
    case earned
    case spent
    case bonus
    case adjustment
    case expired
}

public enum TransactionSource: String, Codable, Hashable, Sendable {
    case checkIn = "check_in"
    case prediction
    case trivia
    case noiseMeter = "noise_meter"
    case poll
    case photoChallenge = "photo_challenge"
    case reward
    case referral
    case streak
    case admin
    case content
}
