import Foundation
import RallyCore
import RallyNetworking

/// Batched impression tracking system that collects sponsor impressions
/// locally and reports them to the backend in configurable batches.
///
/// Impressions are accumulated in memory and flushed when either the
/// batch size threshold or the time interval is reached. A flush is also
/// triggered when the app transitions to the background.
///
/// All public API is safe to call from any isolation context; internal
/// state is protected by an actor.
public final class ImpressionTracker: Sendable {

    // MARK: - Configuration

    /// Configuration for batching behavior.
    public struct Configuration: Sendable {
        /// Maximum number of impressions to accumulate before an automatic flush.
        public let batchSize: Int

        /// Maximum time (in seconds) between automatic flushes.
        public let flushInterval: TimeInterval

        /// Number of retry attempts for failed flush operations.
        public let maxRetries: Int

        public init(
            batchSize: Int = 20,
            flushInterval: TimeInterval = 60,
            maxRetries: Int = 3
        ) {
            self.batchSize = batchSize
            self.flushInterval = flushInterval
            self.maxRetries = maxRetries
        }

        /// Default configuration with sensible production values.
        public static let `default` = Configuration()

        /// Aggressive configuration for high-traffic gameday scenarios.
        public static let gameday = Configuration(
            batchSize: 10,
            flushInterval: 30,
            maxRetries: 5
        )
    }

    // MARK: - Dependencies

    private let sponsorService: SponsorServiceProtocol
    private let configuration: Configuration
    private let storage: ImpressionStorage

    // MARK: - Init

    public init(
        sponsorService: SponsorServiceProtocol,
        configuration: Configuration = .default
    ) {
        self.sponsorService = sponsorService
        self.configuration = configuration
        self.storage = ImpressionStorage()
    }

    // MARK: - Record

    /// Records a single sponsor impression. The impression is accumulated
    /// in the local buffer and will be flushed when the batch threshold or
    /// time interval is reached.
    public func record(_ impression: SponsorImpression) {
        Task {
            await storage.append(impression)
            let count = await storage.count
            if count >= configuration.batchSize {
                await flush()
            }
        }
    }

    // MARK: - Flush

    /// Flushes all pending impressions to the backend. Safe to call
    /// multiple times concurrently; the storage actor serializes access.
    public func flush() async {
        let batch = await storage.drainAll()
        guard !batch.isEmpty else { return }

        var lastError: Error?
        for attempt in 1...configuration.maxRetries {
            do {
                for impression in batch {
                    try Task.checkCancellation()
                    await sponsorService.trackImpression(impression)
                }
                // Success — clear any error and return.
                lastError = nil
                break
            } catch {
                lastError = error
                if attempt < configuration.maxRetries {
                    // Exponential backoff: 1s, 2s, 4s ...
                    let delay = UInt64(pow(2.0, Double(attempt - 1))) * 1_000_000_000
                    try? await Task.sleep(nanoseconds: delay)
                }
            }
        }

        // If all retries failed, put the impressions back for the next flush.
        if lastError != nil {
            await storage.prepend(batch)
        }
    }

    // MARK: - Lifecycle

    /// Starts the periodic flush timer. Call this when the app becomes active.
    public func startPeriodicFlush() -> Task<Void, Never> {
        Task { [configuration] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(configuration.flushInterval))
                guard !Task.isCancelled else { break }
                await flush()
            }
        }
    }

    /// Returns the number of pending impressions in the buffer.
    public var pendingCount: Int {
        get async {
            await storage.count
        }
    }
}

// MARK: - Impression Storage Actor

/// Actor-isolated storage that serializes read/write access to the
/// impression buffer, preventing data races under strict concurrency.
private actor ImpressionStorage {
    private var buffer: [SponsorImpression] = []

    var count: Int { buffer.count }

    func append(_ impression: SponsorImpression) {
        buffer.append(impression)
    }

    func prepend(_ impressions: [SponsorImpression]) {
        buffer.insert(contentsOf: impressions, at: 0)
    }

    func drainAll() -> [SponsorImpression] {
        let drained = buffer
        buffer.removeAll()
        return drained
    }
}
