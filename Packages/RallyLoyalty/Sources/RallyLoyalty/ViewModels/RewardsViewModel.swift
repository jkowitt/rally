import Foundation
import SwiftUI
import RallyCore
import RallyNetworking
import LocalAuthentication

// MARK: - Rewards View Model

/// Drives the rewards catalog, filtering, and redemption flows.
///
/// Uses `@Observable` and `@MainActor` so SwiftUI views can bind directly
/// to published properties without manual dispatching.
@MainActor
@Observable
public final class RewardsViewModel {

    // MARK: - Published State

    /// All available rewards fetched from the server.
    public private(set) var rewards: [Reward] = []

    /// The rewards currently visible after applying filters and search.
    public private(set) var filteredRewards: [Reward] = []

    /// The user's current tier, used to badge locked rewards.
    public private(set) var currentTier: Tier = .rookie

    /// Current points balance for affordability checks.
    public private(set) var currentBalance: Int = 0

    /// Loading state for the catalog fetch.
    public private(set) var isLoading = false

    /// Error from the most recent operation, cleared on retry.
    public private(set) var error: String?

    /// Active redemption flow state.
    public private(set) var redemptionState: RedemptionState = .idle

    /// The most recent successful redemption result.
    public private(set) var lastRedemption: Redemption?

    // MARK: - Filter State

    /// Free-text search query applied to reward titles and descriptions.
    public var searchQuery: String = "" {
        didSet { applyFilters() }
    }

    /// Selected category filter. `nil` means "all categories".
    public var selectedCategory: RewardCategory? {
        didSet { applyFilters() }
    }

    /// When `true`, only rewards the user can currently afford are shown.
    public var showAffordableOnly: Bool = false {
        didSet { applyFilters() }
    }

    /// When `true`, only rewards at or below the user's tier are shown.
    public var showEligibleOnly: Bool = false {
        didSet { applyFilters() }
    }

    // MARK: - Dependencies

    private let rewardRepository: RewardRepositoryProtocol
    private let pointsEngine: PointsEngine
    private let schoolID: String

    // MARK: - Initialization

    /// Creates a new RewardsViewModel.
    ///
    /// - Parameters:
    ///   - rewardRepository: Data source for rewards and redemptions.
    ///   - pointsEngine: The shared points engine for balance and tier data.
    ///   - schoolID: The school whose rewards catalog to load.
    public init(
        rewardRepository: RewardRepositoryProtocol,
        pointsEngine: PointsEngine,
        schoolID: String
    ) {
        self.rewardRepository = rewardRepository
        self.pointsEngine = pointsEngine
        self.schoolID = schoolID
    }

    // MARK: - Data Loading

    /// Fetches the rewards catalog and refreshes the user's balance/tier.
    public func loadCatalog() async {
        isLoading = true
        error = nil

        do {
            async let fetchedRewards = rewardRepository.fetchRewards(schoolID: schoolID)
            async let balance = pointsEngine.balance
            async let tier = pointsEngine.currentTier

            let rewardsList = try await fetchedRewards
            let resolvedBalance = await balance
            let resolvedTier = await tier

            rewards = rewardsList.filter(\.isActive)
            currentBalance = resolvedBalance
            currentTier = resolvedTier
            applyFilters()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Refreshes balance and tier from the points engine without re-fetching
    /// the full catalog.
    public func refreshBalanceAndTier() async {
        currentBalance = await pointsEngine.balance
        currentTier = await pointsEngine.currentTier
        applyFilters()
    }

    // MARK: - Filtering

    /// Applies the current filter and search state to produce `filteredRewards`.
    private func applyFilters() {
        var result = rewards

        // Category filter
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }

        // Tier eligibility filter
        if showEligibleOnly {
            result = result.filter { $0.minimumTier <= currentTier }
        }

        // Affordability filter
        if showAffordableOnly {
            result = result.filter { $0.pointsCost <= currentBalance }
        }

        // Search query
        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(query)
                    || $0.description.lowercased().contains(query)
            }
        }

        // Sort: affordable & eligible first, then by points cost ascending.
        result.sort { lhs, rhs in
            let lhsEligible = lhs.minimumTier <= currentTier
            let rhsEligible = rhs.minimumTier <= currentTier
            if lhsEligible != rhsEligible { return lhsEligible }
            return lhs.pointsCost < rhs.pointsCost
        }

        filteredRewards = result
    }

    // MARK: - Reward Eligibility

    /// Whether the user can redeem the given reward right now.
    public func canRedeem(_ reward: Reward) -> Bool {
        reward.minimumTier <= currentTier
            && reward.pointsCost <= currentBalance
            && reward.isActive
            && (reward.inventory ?? 1) > 0
    }

    /// Returns a human-readable reason why a reward cannot be redeemed,
    /// or `nil` if it can be redeemed.
    public func ineligibilityReason(for reward: Reward) -> String? {
        if reward.minimumTier > currentTier {
            return "Requires \(reward.minimumTier.rawValue) tier"
        }
        if reward.pointsCost > currentBalance {
            return "Need \((reward.pointsCost - currentBalance).pointsFormatted) more"
        }
        if let inventory = reward.inventory, inventory <= 0 {
            return "Out of stock"
        }
        if !reward.isActive {
            return "No longer available"
        }
        return nil
    }

    // MARK: - Redemption Flow

    /// Initiates the redemption flow for a reward. Requires biometric
    /// authentication before proceeding.
    ///
    /// The flow is: idle -> authenticating -> confirming -> processing -> success/failed
    public func beginRedemption(for reward: Reward) async {
        guard canRedeem(reward) else {
            redemptionState = .failed("You are not eligible to redeem this reward.")
            return
        }

        redemptionState = .authenticating

        // Biometric authentication (Face ID / Touch ID)
        let context = LAContext()
        var authError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            // Fall back to device passcode if biometrics are unavailable.
            do {
                let success = try await context.evaluatePolicy(
                    .deviceOwnerAuthentication,
                    localizedReason: "Authenticate to redeem \(reward.title)"
                )
                guard success else {
                    redemptionState = .failed("Authentication required to redeem rewards.")
                    return
                }
            } catch {
                redemptionState = .failed("Authentication failed: \(error.localizedDescription)")
                return
            }
            await processRedemption(for: reward)
            return
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Authenticate to redeem \(reward.title)"
            )
            guard success else {
                redemptionState = .failed("Biometric authentication was not successful.")
                return
            }
        } catch {
            redemptionState = .failed("Authentication failed: \(error.localizedDescription)")
            return
        }

        await processRedemption(for: reward)
    }

    /// Processes the server-side redemption after authentication succeeds.
    private func processRedemption(for reward: Reward) async {
        redemptionState = .processing

        // Apply optimistic balance deduction.
        await pointsEngine.applyRedemptionSpend(for: reward)

        do {
            let result = try await rewardRepository.redeemReward(id: reward.id)
            currentBalance = result.newBalance
            lastRedemption = result.redemption
            redemptionState = .success(result.redemption)

            // Refresh tier in case balance-related data changed.
            currentTier = await pointsEngine.currentTier
            applyFilters()
        } catch {
            // Reconcile will fix the optimistic deduction.
            redemptionState = .failed(error.localizedDescription)
            try? await pointsEngine.reconcile()
            currentBalance = await pointsEngine.balance
            applyFilters()
        }
    }

    /// Resets the redemption state back to idle.
    public func resetRedemptionState() {
        redemptionState = .idle
        lastRedemption = nil
    }
}

// MARK: - Redemption State

/// Represents the stages of the reward redemption flow.
public enum RedemptionState: Equatable {
    case idle
    case authenticating
    case confirming(Reward)
    case processing
    case success(Redemption)
    case failed(String)

    public static func == (lhs: RedemptionState, rhs: RedemptionState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle):
            return true
        case (.authenticating, .authenticating):
            return true
        case (.confirming(let a), .confirming(let b)):
            return a.id == b.id
        case (.processing, .processing):
            return true
        case (.success(let a), .success(let b)):
            return a.id == b.id
        case (.failed(let a), .failed(let b)):
            return a == b
        default:
            return false
        }
    }
}
