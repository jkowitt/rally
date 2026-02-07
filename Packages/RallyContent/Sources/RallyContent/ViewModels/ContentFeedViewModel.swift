import Foundation
import RallyCore
import RallyNetworking

/// Drives the year-round content feed with pagination, pull-to-refresh,
/// and automatic staleness invalidation (1 hour TTL).
@MainActor
@Observable
public final class ContentFeedViewModel {

    // MARK: - Public State

    /// The accumulated feed items across all loaded pages.
    public private(set) var items: [ContentItem] = []

    /// Whether the initial load or a refresh is in progress.
    public private(set) var isLoading = false

    /// Whether a next-page fetch is in flight.
    public private(set) var isLoadingMore = false

    /// User-facing error message from the last failed operation.
    public private(set) var errorMessage: String?

    /// `true` when no more pages are available from the API.
    public private(set) var hasReachedEnd = false

    // MARK: - Private State

    private var currentPage = 1
    private let pageSize = 20
    private var lastFetchedAt: Date?

    /// Content is considered stale after 1 hour.
    private let staleDuration: TimeInterval = 3_600

    // MARK: - Dependencies

    private let contentRepository: ContentRepositoryProtocol
    private let schoolID: String

    // MARK: - Init

    public init(contentRepository: ContentRepositoryProtocol, schoolID: String) {
        self.contentRepository = contentRepository
        self.schoolID = schoolID
    }

    // MARK: - Public API

    /// Loads the first page of the feed. Automatically called on appear and
    /// when the cached data is stale (older than 1 hour).
    public func loadFeed() async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil
        currentPage = 1
        hasReachedEnd = false

        do {
            let response = try await contentRepository.fetchFeed(
                schoolID: schoolID,
                page: currentPage,
                pageSize: pageSize
            )
            items = response.items
            hasReachedEnd = response.page >= response.totalPages
            lastFetchedAt = .now
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Pulls-to-refresh: resets to page 1 and re-fetches.
    public func refresh() async {
        await loadFeed()
    }

    /// Loads the next page and appends results. Call when the user scrolls
    /// near the bottom of the list.
    public func loadMoreIfNeeded(currentItem: ContentItem) async {
        // Trigger when the user reaches the last 3 items.
        guard let index = items.firstIndex(where: { $0.id == currentItem.id }),
              index >= items.count - 3 else {
            return
        }

        await loadNextPage()
    }

    /// Forces a next-page fetch regardless of scroll position.
    public func loadNextPage() async {
        guard !isLoadingMore, !hasReachedEnd else { return }

        isLoadingMore = true

        do {
            let nextPage = currentPage + 1
            let response = try await contentRepository.fetchFeed(
                schoolID: schoolID,
                page: nextPage,
                pageSize: pageSize
            )
            items.append(contentsOf: response.items)
            currentPage = nextPage
            hasReachedEnd = response.page >= response.totalPages
            lastFetchedAt = .now
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoadingMore = false
    }

    /// Returns `true` if the cached feed data is older than the stale duration.
    public var isStale: Bool {
        guard let lastFetchedAt else { return true }
        return Date.now.timeIntervalSince(lastFetchedAt) > staleDuration
    }

    /// Checks staleness on appear and reloads if necessary.
    public func loadIfStale() async {
        if isStale {
            await loadFeed()
        }
    }

    /// Filters items by content type for section display.
    public func items(ofType type: ContentType) -> [ContentItem] {
        items.filter { $0.type == type }
    }
}
