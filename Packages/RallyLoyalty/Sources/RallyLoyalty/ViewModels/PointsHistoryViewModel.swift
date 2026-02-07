import Foundation
import SwiftUI
import RallyCore

// MARK: - Points History View Model

/// Drives the transaction history screen with pagination, filtering, and
/// grouped date sections.
@MainActor
@Observable
public final class PointsHistoryViewModel {

    // MARK: - Published State

    /// All loaded transactions, newest first.
    public private(set) var transactions: [PointsTransaction] = []

    /// Transactions grouped by date section for display.
    public private(set) var groupedTransactions: [TransactionGroup] = []

    /// The user's current balance.
    public private(set) var currentBalance: Int = 0

    /// Whether the initial load is in progress.
    public private(set) var isLoading = false

    /// Whether an additional page is currently being fetched.
    public private(set) var isLoadingMore = false

    /// Whether all pages have been loaded.
    public private(set) var hasReachedEnd = false

    /// Error from the most recent operation.
    public private(set) var error: String?

    // MARK: - Filter State

    /// Filter by transaction type. `nil` shows all types.
    public var selectedType: TransactionType? {
        didSet { applyFilters() }
    }

    /// Filter by transaction source. `nil` shows all sources.
    public var selectedSource: TransactionSource? {
        didSet { applyFilters() }
    }

    // MARK: - Pagination

    private var currentPage = 1
    private let pageSize = 20
    private var allLoadedTransactions: [PointsTransaction] = []

    // MARK: - Dependencies

    private let pointsEngine: PointsEngine

    // MARK: - Initialization

    public init(pointsEngine: PointsEngine) {
        self.pointsEngine = pointsEngine
    }

    // MARK: - Data Loading

    /// Loads the first page of transaction history.
    public func loadInitialHistory() async {
        isLoading = true
        error = nil
        currentPage = 1
        hasReachedEnd = false
        allLoadedTransactions = []

        do {
            let response = try await pointsEngine.loadTransactionPage(
                page: currentPage,
                pageSize: pageSize
            )
            allLoadedTransactions = response.items
            currentBalance = await pointsEngine.balance
            hasReachedEnd = response.page >= response.totalPages
            applyFilters()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    /// Loads the next page of transaction history if available.
    public func loadNextPageIfNeeded(currentItem: PointsTransaction?) async {
        // Trigger pagination when the user scrolls near the bottom.
        guard let currentItem else { return }
        let thresholdIndex = transactions.index(
            transactions.endIndex,
            offsetBy: -5,
            limitedBy: transactions.startIndex
        ) ?? transactions.startIndex
        guard let itemIndex = transactions.firstIndex(where: { $0.id == currentItem.id }),
              itemIndex >= thresholdIndex else { return }

        await loadNextPage()
    }

    /// Fetches the next page unconditionally.
    public func loadNextPage() async {
        guard !isLoadingMore, !hasReachedEnd else { return }

        isLoadingMore = true
        currentPage += 1

        do {
            let response = try await pointsEngine.loadTransactionPage(
                page: currentPage,
                pageSize: pageSize
            )

            // Deduplicate
            let existingIDs = Set(allLoadedTransactions.map(\.id))
            let newItems = response.items.filter { !existingIDs.contains($0.id) }
            allLoadedTransactions.append(contentsOf: newItems)
            hasReachedEnd = response.page >= response.totalPages
            applyFilters()
        } catch {
            currentPage -= 1
            self.error = error.localizedDescription
        }

        isLoadingMore = false
    }

    /// Refreshes the history from the beginning after a pull-to-refresh.
    public func refresh() async {
        await loadInitialHistory()
    }

    // MARK: - Filtering

    private func applyFilters() {
        var result = allLoadedTransactions

        if let type = selectedType {
            result = result.filter { $0.type == type }
        }

        if let source = selectedSource {
            result = result.filter { $0.source == source }
        }

        transactions = result
        groupedTransactions = Self.group(result)
    }

    /// Clears all active filters.
    public func clearFilters() {
        selectedType = nil
        selectedSource = nil
    }

    // MARK: - Grouping

    /// Groups transactions by calendar date.
    private static func group(_ transactions: [PointsTransaction]) -> [TransactionGroup] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: transactions) { tx in
            calendar.startOfDay(for: tx.createdAt)
        }

        return grouped.map { date, items in
            TransactionGroup(date: date, transactions: items.sorted { $0.createdAt > $1.createdAt })
        }
        .sorted { $0.date > $1.date }
    }
}

// MARK: - Transaction Group

/// A group of transactions sharing the same calendar date.
public struct TransactionGroup: Identifiable, Sendable {
    public var id: Date { date }
    public let date: Date
    public let transactions: [PointsTransaction]

    /// Formatted section header (e.g., "Today", "Yesterday", "Oct 12, 2024").
    public var headerTitle: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .none
            return formatter.string(from: date)
        }
    }

    /// Net points for this day.
    public var netPoints: Int {
        transactions.reduce(0) { $0 + $1.amount }
    }
}
