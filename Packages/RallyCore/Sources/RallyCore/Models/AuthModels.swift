import Foundation

/// Response from authentication endpoints.
public struct AuthResponse: Codable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: TimeInterval
    public let user: UserProfile

    public init(
        accessToken: String,
        refreshToken: String,
        expiresIn: TimeInterval,
        user: UserProfile
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresIn = expiresIn
        self.user = user
    }
}

/// Token pair for refresh operations.
public struct TokenPair: Codable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: TimeInterval

    public init(accessToken: String, refreshToken: String, expiresIn: TimeInterval) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresIn = expiresIn
    }
}

/// Request body for Sign in with Apple.
public struct AppleAuthRequest: Codable, Sendable {
    public let identityToken: String
    public let authorizationCode: String
    public let fullName: String?
    public let email: String?

    public init(
        identityToken: String,
        authorizationCode: String,
        fullName: String? = nil,
        email: String? = nil
    ) {
        self.identityToken = identityToken
        self.authorizationCode = authorizationCode
        self.fullName = fullName
        self.email = email
    }
}

/// Result from check-in submission.
public struct CheckInResponse: Codable, Sendable {
    public let checkIn: CheckIn
    public let pointsEarned: Int
    public let newBalance: Int
    public let streakCount: Int
    public let message: String?

    public init(
        checkIn: CheckIn,
        pointsEarned: Int,
        newBalance: Int,
        streakCount: Int = 0,
        message: String? = nil
    ) {
        self.checkIn = checkIn
        self.pointsEarned = pointsEarned
        self.newBalance = newBalance
        self.streakCount = streakCount
        self.message = message
    }
}

/// Result from activation submission (prediction, trivia, etc.).
public struct SubmissionResult: Codable, Sendable {
    public let isCorrect: Bool?
    public let pointsEarned: Int
    public let newBalance: Int
    public let message: String?

    public init(
        isCorrect: Bool? = nil,
        pointsEarned: Int,
        newBalance: Int,
        message: String? = nil
    ) {
        self.isCorrect = isCorrect
        self.pointsEarned = pointsEarned
        self.newBalance = newBalance
        self.message = message
    }
}

/// Result from reward redemption.
public struct RedemptionResult: Codable, Sendable {
    public let redemption: Redemption
    public let newBalance: Int
    public let message: String?

    public init(redemption: Redemption, newBalance: Int, message: String? = nil) {
        self.redemption = redemption
        self.newBalance = newBalance
        self.message = message
    }
}

/// Generic paginated response wrapper.
public struct PaginatedResponse<T: Codable & Sendable>: Codable, Sendable {
    public let items: [T]
    public let page: Int
    public let pageSize: Int
    public let totalItems: Int
    public let totalPages: Int

    public init(items: [T], page: Int, pageSize: Int, totalItems: Int, totalPages: Int) {
        self.items = items
        self.page = page
        self.pageSize = pageSize
        self.totalItems = totalItems
        self.totalPages = totalPages
    }
}
