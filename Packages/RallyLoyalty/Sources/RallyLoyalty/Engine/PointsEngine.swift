import Foundation
import RallyCore

// MARK: - Points Engine

/// Actor-isolated points engine that manages the local ledger, computes tier
/// status, applies optimistic point updates, and reconciles with the server.
///
/// All mutations to the ledger are serialized through the actor, ensuring
/// data-race-free access even when multiple subsystems earn points
/// concurrently (e.g., check-in + trivia during a live game).
public actor PointsEngine {

    // MARK: - State

    /// The authoritative local ledger, ordered newest-first.
    private var ledger: [PointsTransaction]

    /// Cached balance derived from the ledger. Recalculated on every mutation.
    private var _cachedBalance: Int

    /// Cached lifetime earned points (sum of all positive transactions).
    private var _cachedLifetimePoints: Int

    /// Pending optimistic transactions that have not yet been reconciled
    /// with the server. Keyed by transaction ID for fast lookup.
    private var pendingOptimistic: [String: PointsTransaction] = [:]

    /// Repository used for server communication.
    private let pointsRepository: PointsRepositoryProtocol

    /// Repository used for reward redemption verification.
    private let rewardRepository: RewardRepositoryProtocol

    /// Callback stream listeners receive balance change notifications.
    private var balanceCallbacks: [(BalanceSnapshot) -> Void] = []

    // MARK: - Initialization

    /// Creates a new PointsEngine backed by the given repositories.
    ///
    /// - Parameters:
    ///   - pointsRepository: The data source for server-side points operations.
    ///   - rewardRepository: The data source for reward redemption.
    ///   - initialBalance: Optional seed balance when the engine starts before
    ///     the first sync completes.
    ///   - initialLifetimePoints: Optional seed lifetime points.
    public init(
        pointsRepository: PointsRepositoryProtocol,
        rewardRepository: RewardRepositoryProtocol,
        initialBalance: Int = 0,
        initialLifetimePoints: Int = 0
    ) {
        self.pointsRepository = pointsRepository
        self.rewardRepository = rewardRepository
        self.ledger = []
        self._cachedBalance = initialBalance
        self._cachedLifetimePoints = initialLifetimePoints
    }

    // MARK: - Public Read Accessors

    /// The current computed balance, including optimistic updates.
    public var balance: Int { _cachedBalance }

    /// Lifetime earned points used for tier calculation.
    public var lifetimePoints: Int { _cachedLifetimePoints }

    /// The user's current tier based on lifetime points.
    public var currentTier: Tier {
        Self.tier(for: _cachedLifetimePoints)
    }

    /// Points required to reach the next tier. Returns `nil` if the user
    /// is already at the highest tier (Hall of Fame).
    public var pointsToNextTier: Int? {
        guard let next = currentTier.nextTier else { return nil }
        return max(0, next.minimumPoints - _cachedLifetimePoints)
    }

    /// Progress fraction (0...1) toward the next tier.
    public var tierProgress: Double {
        let current = currentTier
        guard let next = current.nextTier else { return 1.0 }
        let floor = current.minimumPoints
        let ceiling = next.minimumPoints
        let range = ceiling - floor
        guard range > 0 else { return 1.0 }
        let earned = _cachedLifetimePoints - floor
        return min(1.0, max(0.0, Double(earned) / Double(range)))
    }

    /// Returns the most recent transactions, up to `limit`.
    public func recentTransactions(limit: Int = 20) -> [PointsTransaction] {
        Array(ledger.prefix(limit))
    }

    /// Returns the full ledger snapshot.
    public func allTransactions() -> [PointsTransaction] {
        ledger
    }

    // MARK: - Tier Calculation

    /// Determines the tier for a given lifetime point total.
    public static func tier(for lifetimePoints: Int) -> Tier {
        // Walk tiers in descending order to find the highest qualifying tier.
        let tiers: [(Tier, Int)] = [
            (.hallOfFame, 15_000),
            (.mvp, 5_000),
            (.allStar, 2_000),
            (.starter, 500),
            (.rookie, 0)
        ]
        for (tier, threshold) in tiers where lifetimePoints >= threshold {
            return tier
        }
        return .rookie
    }

    /// Returns a ``TierSnapshot`` describing the user's current tier status.
    public func tierSnapshot() -> TierSnapshot {
        TierSnapshot(
            currentTier: currentTier,
            lifetimePoints: _cachedLifetimePoints,
            currentBalance: _cachedBalance,
            nextTier: currentTier.nextTier,
            pointsToNextTier: pointsToNextTier,
            progress: tierProgress
        )
    }

    // MARK: - Optimistic Updates

    /// Applies an optimistic point credit to the ledger before server
    /// confirmation arrives. Call ``reconcile()`` to sync with the server.
    ///
    /// - Parameters:
    ///   - amount: The number of points earned (positive) or spent (negative).
    ///   - source: Where the points came from.
    ///   - description: Human-readable description of the transaction.
    ///   - eventID: Optional associated event.
    ///   - activationID: Optional associated activation.
    /// - Returns: The optimistic transaction that was appended to the ledger.
    @discardableResult
    public func applyOptimistic(
        amount: Int,
        type: TransactionType = .earned,
        source: TransactionSource,
        description: String,
        eventID: String? = nil,
        activationID: String? = nil
    ) -> PointsTransaction {
        let transaction = PointsTransaction(
            id: "optimistic-\(UUID().uuidString)",
            userID: "",
            amount: amount,
            type: type,
            source: source,
            description: description,
            eventID: eventID,
            activationID: activationID,
            createdAt: .now,
            isReconciled: false
        )

        ledger.insert(transaction, at: 0)
        pendingOptimistic[transaction.id] = transaction
        recalculateBalances()
        notifyListeners()

        return transaction
    }

    /// Records a reward redemption as an optimistic spend.
    ///
    /// - Parameter reward: The reward being redeemed.
    /// - Returns: The optimistic spend transaction.
    @discardableResult
    public func applyRedemptionSpend(for reward: Reward) -> PointsTransaction {
        applyOptimistic(
            amount: -reward.pointsCost,
            type: .spent,
            source: .reward,
            description: "Redeemed: \(reward.title)"
        )
    }

    // MARK: - Server Reconciliation

    /// Fetches the latest balance and transaction history from the server,
    /// replaces optimistic entries with confirmed data, and resolves any
    /// discrepancies.
    ///
    /// This should be called periodically and after connectivity is restored.
    public func reconcile() async throws {
        // Fetch server-side balance and recent transactions concurrently.
        async let serverBalance = pointsRepository.fetchBalance()
        async let serverPage = pointsRepository.fetchTransactions(page: 1, pageSize: 50)

        let balance = try await serverBalance
        let page = try await serverPage

        // Replace the local ledger with reconciled data.
        let reconciledTransactions = page.items

        // Remove optimistic entries that now have server-confirmed equivalents.
        var remaining = pendingOptimistic
        for confirmed in reconciledTransactions {
            // Match optimistic transactions by source + activationID or eventID.
            let matchKey = remaining.first { _, optimistic in
                optimistic.source == confirmed.source
                    && optimistic.activationID == confirmed.activationID
                    && optimistic.eventID == confirmed.eventID
                    && abs(optimistic.amount - confirmed.amount) == 0
            }?.key
            if let key = matchKey {
                remaining.removeValue(forKey: key)
            }
        }

        // Build the new ledger: server transactions + any still-pending optimistic ones.
        var newLedger = reconciledTransactions
        for (_, optimistic) in remaining {
            // Keep optimistic entries that were not matched, so the user
            // does not see points vanish before the server catches up.
            newLedger.insert(optimistic, at: 0)
        }

        ledger = newLedger.sorted { $0.createdAt > $1.createdAt }
        pendingOptimistic = remaining
        _cachedBalance = balance
        recalculateLifetime()
        notifyListeners()

        // Ask the server to run its own reconciliation pass.
        try await pointsRepository.reconcile()
    }

    /// Loads a page of transaction history from the server and appends to
    /// the local ledger.
    public func loadTransactionPage(page: Int, pageSize: Int = 20) async throws -> PaginatedResponse<PointsTransaction> {
        let response = try await pointsRepository.fetchTransactions(page: page, pageSize: pageSize)

        // Merge into ledger, avoiding duplicates.
        let existingIDs = Set(ledger.map(\.id))
        let newEntries = response.items.filter { !existingIDs.contains($0.id) }
        ledger.append(contentsOf: newEntries)
        ledger.sort { $0.createdAt > $1.createdAt }

        return response
    }

    // MARK: - Balance Observation

    /// Registers a callback invoked whenever the balance changes.
    /// Returns a closure that removes the registration when called.
    @discardableResult
    public func onBalanceChange(_ callback: @escaping @Sendable (BalanceSnapshot) -> Void) -> (() -> Void) {
        let index = balanceCallbacks.count
        balanceCallbacks.append(callback)
        return { [weak self] in
            Task { await self?.removeCallback(at: index) }
        }
    }

    private func removeCallback(at index: Int) {
        guard index < balanceCallbacks.count else { return }
        balanceCallbacks[index] = { _ in }
    }

    // MARK: - Private Helpers

    private func recalculateBalances() {
        recalculateCurrentBalance()
        recalculateLifetime()
    }

    private func recalculateCurrentBalance() {
        _cachedBalance = ledger.reduce(0) { total, tx in
            switch tx.type {
            case .earned, .bonus:
                return total + tx.amount
            case .spent:
                return total + tx.amount // amount is already negative
            case .adjustment:
                return total + tx.amount
            case .expired:
                return total + tx.amount
            }
        }
    }

    private func recalculateLifetime() {
        _cachedLifetimePoints = ledger
            .filter { $0.type == .earned || $0.type == .bonus }
            .reduce(0) { $0 + $1.amount }
    }

    private func notifyListeners() {
        let snapshot = BalanceSnapshot(
            balance: _cachedBalance,
            lifetimePoints: _cachedLifetimePoints,
            tier: currentTier,
            pendingCount: pendingOptimistic.count
        )
        for callback in balanceCallbacks {
            callback(snapshot)
        }
    }
}

// MARK: - Supporting Types

/// A point-in-time snapshot of the user's balance state.
public struct BalanceSnapshot: Sendable, Equatable {
    public let balance: Int
    public let lifetimePoints: Int
    public let tier: Tier
    public let pendingCount: Int
}

/// A snapshot of the user's tier progression.
public struct TierSnapshot: Sendable, Equatable {
    public let currentTier: Tier
    public let lifetimePoints: Int
    public let currentBalance: Int
    public let nextTier: Tier?
    public let pointsToNextTier: Int?
    /// Progress toward the next tier as a value between 0 and 1.
    public let progress: Double
}
