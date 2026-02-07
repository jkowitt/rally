import Foundation
import RallyCore
import RallyNetworking

/// Manages sponsor activation lifecycle including fetching sponsor data,
/// resolving placements, and coordinating impression tracking.
///
/// `SponsorManager` acts as the central coordinator between the sponsor
/// service backend and the impression tracking pipeline. It maintains an
/// in-memory cache of sponsors per school with a configurable TTL.
@MainActor
@Observable
public final class SponsorManager {

    // MARK: - Public State

    /// All sponsors loaded for the current school context.
    public private(set) var sponsors: [Sponsor] = []

    /// Whether a sponsor fetch is currently in progress.
    public private(set) var isLoading = false

    /// The most recent error message, if any.
    public private(set) var errorMessage: String?

    // MARK: - Private State

    /// Maps school IDs to their cached sponsor lists.
    private var cache: [String: CachedSponsors] = [:]

    /// Cache TTL: sponsors are re-fetched after 30 minutes.
    private let cacheTTL: TimeInterval = 1_800

    // MARK: - Dependencies

    private let sponsorService: SponsorServiceProtocol
    private let impressionTracker: ImpressionTracker

    // MARK: - Init

    public init(sponsorService: SponsorServiceProtocol, impressionTracker: ImpressionTracker) {
        self.sponsorService = sponsorService
        self.impressionTracker = impressionTracker
    }

    // MARK: - Fetch Sponsors

    /// Loads sponsors for the given school, using the cache when fresh.
    public func loadSponsors(schoolID: String) async {
        // Return cached data if still fresh.
        if let cached = cache[schoolID], !cached.isExpired(ttl: cacheTTL) {
            sponsors = cached.sponsors
            return
        }

        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            let fetched = try await sponsorService.fetchSponsors(schoolID: schoolID)
            sponsors = fetched
            cache[schoolID] = CachedSponsors(sponsors: fetched, fetchedAt: .now)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Invalidates the cache for a specific school, forcing a network
    /// fetch on the next `loadSponsors` call.
    public func invalidateCache(schoolID: String) {
        cache.removeValue(forKey: schoolID)
    }

    /// Invalidates the entire sponsor cache.
    public func invalidateAllCaches() {
        cache.removeAll()
    }

    // MARK: - Sponsor Lookup

    /// Returns the sponsor for the given ID, if loaded.
    public func sponsor(byID id: String) -> Sponsor? {
        sponsors.first { $0.id == id }
    }

    /// Returns sponsors filtered by tier.
    public func sponsors(forTier tier: SponsorTier) -> [Sponsor] {
        sponsors.filter { $0.tier == tier }
    }

    /// Returns the presenting sponsor, if one exists.
    public var presentingSponsor: Sponsor? {
        sponsors.first { $0.tier == .presenting }
    }

    // MARK: - Impression Tracking

    /// Records a sponsor impression for the given placement. The impression
    /// is batched and flushed asynchronously by `ImpressionTracker`.
    public func recordImpression(
        sponsorID: String,
        placement: String,
        activationID: String? = nil,
        eventID: String? = nil
    ) {
        let impression = SponsorImpression(
            sponsorID: sponsorID,
            placement: placement,
            activationID: activationID,
            eventID: eventID,
            timestamp: .now,
            durationSeconds: nil
        )
        impressionTracker.record(impression)
    }

    /// Records a timed impression, typically used when a sponsor banner
    /// has been visible for a measured duration.
    public func recordTimedImpression(
        sponsorID: String,
        placement: String,
        duration: TimeInterval,
        activationID: String? = nil,
        eventID: String? = nil
    ) {
        let impression = SponsorImpression(
            sponsorID: sponsorID,
            placement: placement,
            activationID: activationID,
            eventID: eventID,
            timestamp: .now,
            durationSeconds: duration
        )
        impressionTracker.record(impression)
    }

    /// Flushes any pending impression batches immediately.
    public func flushImpressions() async {
        await impressionTracker.flush()
    }
}

// MARK: - Cached Sponsors

private struct CachedSponsors {
    let sponsors: [Sponsor]
    let fetchedAt: Date

    func isExpired(ttl: TimeInterval) -> Bool {
        Date.now.timeIntervalSince(fetchedAt) > ttl
    }
}
