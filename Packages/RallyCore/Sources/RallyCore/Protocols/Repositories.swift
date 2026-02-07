import Foundation

/// Protocol for school data access.
public protocol SchoolRepositoryProtocol: Sendable {
    func fetchSchools() async throws -> [School]
    func fetchSchool(id: String) async throws -> School
    func cacheSchools(_ schools: [School]) async throws
}

/// Protocol for event data access.
public protocol EventRepositoryProtocol: Sendable {
    func fetchEvents(schoolID: String) async throws -> [Event]
    func fetchEvent(id: String) async throws -> Event
    func fetchActivations(eventID: String) async throws -> [Activation]
}

/// Protocol for user profile data access.
public protocol UserRepositoryProtocol: Sendable {
    func fetchProfile() async throws -> UserProfile
    func updateProfile(_ profile: UserProfile) async throws -> UserProfile
    func updatePreferences(_ preferences: UserPreferences) async throws
}

/// Protocol for check-in operations.
public protocol CheckInRepositoryProtocol: Sendable {
    func submitCheckIn(eventID: String, proof: CheckInProof) async throws -> CheckInResponse
    func fetchCheckInHistory() async throws -> [CheckIn]
    func queueOfflineCheckIn(_ checkIn: CheckIn) async throws
    func syncPendingCheckIns() async throws
}

/// Protocol for reward catalog and redemption.
public protocol RewardRepositoryProtocol: Sendable {
    func fetchRewards(schoolID: String) async throws -> [Reward]
    func redeemReward(id: String) async throws -> RedemptionResult
    func fetchRedemptionHistory() async throws -> [Redemption]
}

/// Protocol for content feed access.
public protocol ContentRepositoryProtocol: Sendable {
    func fetchFeed(schoolID: String, page: Int, pageSize: Int) async throws -> PaginatedResponse<ContentItem>
    func fetchContentItem(id: String) async throws -> ContentItem
}

/// Protocol for activation submission.
public protocol ActivationRepositoryProtocol: Sendable {
    func submitAnswer(activationID: String, optionID: String) async throws -> SubmissionResult
    func submitNoiseMeter(activationID: String, decibelLevel: Double) async throws -> SubmissionResult
    func submitPhoto(activationID: String, imageData: Data) async throws -> SubmissionResult
    func queueOfflineSubmission(activationID: String, payload: Data) async throws
}

/// Protocol for leaderboard access.
public protocol LeaderboardRepositoryProtocol: Sendable {
    func fetchLeaderboard(eventID: String) async throws -> Leaderboard
}

/// Protocol for points ledger operations.
public protocol PointsRepositoryProtocol: Sendable {
    func fetchTransactions(page: Int, pageSize: Int) async throws -> PaginatedResponse<PointsTransaction>
    func fetchBalance() async throws -> Int
    func reconcile() async throws
}
