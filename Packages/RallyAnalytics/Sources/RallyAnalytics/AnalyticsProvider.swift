import Foundation
import RallyCore

// MARK: - Analytics Provider Protocol

/// Abstraction over concrete analytics backends (Mixpanel, Firebase, etc.).
///
/// Each provider receives already-sanitized event data from ``AnalyticsManager``
/// and forwards it to the underlying SDK. Implementations must be `Sendable` so
/// they can be stored inside the actor-isolated manager.
public protocol AnalyticsProvider: Sendable {

    /// Human-readable name used in diagnostic logs (e.g. "Mixpanel", "Firebase").
    var name: String { get }

    /// Tracks a single analytics event with an associated property bag.
    /// - Parameters:
    ///   - event: The event name (e.g. "check_in_completed").
    ///   - properties: Key-value pairs attached to the event.
    func track(event: String, properties: [String: String]) async

    /// Associates all future events with a known user.
    /// - Parameter userID: Stable user identifier (never PII).
    func identify(userID: String) async

    /// Sets long-lived properties on the current user profile.
    /// - Parameter properties: Key-value pairs (e.g. school, tier).
    func setUserProperties(_ properties: [String: String]) async

    /// Clears identification and user state, typically on sign-out.
    func reset() async
}

// MARK: - Console Analytics Provider

/// A debug-only provider that prints events to the console via ``RallyLogger``.
///
/// This provider is automatically registered in non-production environments so
/// engineers can observe event flow without an external dashboard.
public struct ConsoleAnalyticsProvider: AnalyticsProvider {

    public let name = "Console"

    private let logger = RallyLogger(category: "AnalyticsConsole")

    public init() {}

    public func track(event: String, properties: [String: String]) async {
        logger.debug("Event: \(event) | Properties: \(properties.description)")
    }

    public func identify(userID: String) async {
        logger.debug("Identify: \(userID, privacy: .private)")
    }

    public func setUserProperties(_ properties: [String: String]) async {
        logger.debug("User properties: \(properties.description, privacy: .private)")
    }

    public func reset() async {
        logger.debug("Provider reset")
    }
}
