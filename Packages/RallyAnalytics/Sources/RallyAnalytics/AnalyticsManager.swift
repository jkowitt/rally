import Foundation
import RallyCore

// MARK: - Analytics Manager

/// Central analytics coordinator that conforms to ``AnalyticsServiceProtocol``.
///
/// `AnalyticsManager` is an **actor** so all mutable state -- the provider
/// list, enabled flag, and pending queue -- is protected by Swift concurrency
/// without manual locking.
///
/// Events flow through a two-stage pipeline:
/// 1. The public `track(_:)` method receives an ``AnalyticsEvent`` from any
///    module in the app.
/// 2. The manager fans the event out to every registered ``AnalyticsProvider``
///    (Mixpanel, Firebase, console, etc.).
///
/// ### Privacy
/// The manager never logs raw property values at the default log level.
/// Auth tokens and PII are redacted via `privacy: .private` annotations
/// on every `os_log` call site.
public actor AnalyticsManager: AnalyticsServiceProtocol {

    // MARK: - Stored Properties

    /// Registered backend providers that receive forwarded events.
    private var providers: [any AnalyticsProvider] = []

    /// When `false`, all tracking calls are silently dropped.
    private var isEnabled: Bool = true

    /// The user ID most recently passed to ``identify(userID:)``, if any.
    private var currentUserID: String?

    /// Logger scoped to the analytics subsystem.
    private let logger = RallyLogger.analytics

    // MARK: - Initializer

    /// Creates an analytics manager, optionally pre-registering providers.
    ///
    /// - Parameter providers: Zero or more ``AnalyticsProvider`` instances
    ///   to register at creation time.
    public init(providers: [any AnalyticsProvider] = []) {
        self.providers = providers
    }

    // MARK: - Provider Management

    /// Registers an analytics backend.
    ///
    /// Providers added after ``identify(userID:)`` has been called will
    /// **not** retroactively receive the identification call. Register all
    /// providers before the user authenticates, or call `identify` again.
    ///
    /// - Parameter provider: The backend to add.
    public func register(provider: any AnalyticsProvider) {
        providers.append(provider)
        logger.info("Registered analytics provider: \(provider.name)")
    }

    /// Removes all registered providers.
    public func removeAllProviders() {
        providers.removeAll()
        logger.info("All analytics providers removed")
    }

    /// Enables or disables event forwarding.
    ///
    /// When disabled, calls to ``track(_:)``, ``identify(userID:)``, and
    /// ``setUserProperties(_:)`` are no-ops. ``reset()`` still executes so
    /// that sign-out always clears state.
    ///
    /// - Parameter enabled: Pass `false` to suppress tracking (e.g. when
    ///   the user opts out of analytics).
    public func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        logger.notice("Analytics tracking \(enabled ? "enabled" : "disabled")")
    }

    // MARK: - AnalyticsServiceProtocol

    /// Forwards an event to every registered provider.
    ///
    /// Events are enriched with a timestamp property when one is not already
    /// present. Property values are logged at `privacy: .private` to avoid
    /// leaking PII into the system log.
    ///
    /// - Parameter event: The ``AnalyticsEvent`` to track.
    public func track(_ event: AnalyticsEvent) async {
        guard isEnabled else { return }

        logger.debug(
            "Tracking event: \(event.name) properties: \(event.properties.keys.joined(separator: ", "), privacy: .private)"
        )

        var enrichedProperties = event.properties
        if enrichedProperties["timestamp"] == nil {
            enrichedProperties["timestamp"] = ISO8601DateFormatter().string(from: event.timestamp)
        }

        for provider in providers {
            await provider.track(event: event.name, properties: enrichedProperties)
        }
    }

    /// Sends user properties to every registered provider.
    ///
    /// Property values are redacted in logs because they may contain PII
    /// (e.g. email, school name).
    ///
    /// - Parameter properties: Key-value pairs to set on the user profile.
    public func setUserProperties(_ properties: [String: String]) async {
        guard isEnabled else { return }

        logger.debug("Setting user properties: \(properties.keys.joined(separator: ", "), privacy: .private)")

        for provider in providers {
            await provider.setUserProperties(properties)
        }
    }

    /// Associates all subsequent events with the given user.
    ///
    /// The raw `userID` is logged with `privacy: .private` so it is redacted
    /// in production system logs while remaining visible during development.
    ///
    /// - Parameter userID: A stable, non-PII user identifier.
    public func identify(userID: String) async {
        guard isEnabled else { return }

        currentUserID = userID
        logger.info("Identified user: \(userID, privacy: .private)")

        for provider in providers {
            await provider.identify(userID: userID)
        }
    }

    /// Clears user identity and resets all provider state.
    ///
    /// Always executes even when tracking is disabled, so sign-out reliably
    /// purges any cached identity.
    public func reset() async {
        currentUserID = nil
        logger.info("Analytics state reset")

        for provider in providers {
            await provider.reset()
        }
    }
}
