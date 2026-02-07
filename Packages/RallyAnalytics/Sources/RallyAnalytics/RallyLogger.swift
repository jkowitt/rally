import Foundation
import OSLog

// MARK: - Rally Logger

/// Structured logging facade built on top of `os.Logger`.
///
/// Each ``RallyLogger`` instance binds to a fixed **subsystem** (`com.vanwagner.rally`)
/// and a caller-supplied **category** so that log output can be filtered per module in
/// Console.app or Instruments.
///
/// ### Privacy
/// All convenience methods accept interpolated strings that inherit the default
/// `os.Logger` privacy annotations. Callers should apply `privacy: .private` on
/// any value that could contain PII or authentication material:
///
/// ```swift
/// logger.info("Authenticated user \(userID, privacy: .private)")
/// ```
///
/// Because `os_log` already redacts `.private` values in release builds, this
/// logger does **not** add its own runtime filtering.
///
/// ### Concurrency
/// `RallyLogger` is a value type containing only `Sendable` stored properties,
/// making it safe to share across actors and tasks without isolation.
public struct RallyLogger: Sendable {

    // MARK: - Constants

    /// Reverse-DNS subsystem shared by every logger in the Rally app.
    public static let subsystem = "com.vanwagner.rally"

    // MARK: - Stored Properties

    /// The underlying `os.Logger` that performs the actual logging.
    private let logger: Logger

    /// The category string for diagnostic filtering.
    public let category: String

    // MARK: - Initializer

    /// Creates a logger scoped to the given module or feature area.
    ///
    /// - Parameter category: A short identifier for the module
    ///   (e.g. `"Auth"`, `"Location"`, `"Gameday"`).
    public init(category: String) {
        self.category = category
        self.logger = Logger(subsystem: Self.subsystem, category: category)
    }

    // MARK: - Logging Methods

    /// Logs a message at the **debug** level.
    ///
    /// Debug messages are only captured when the log level is explicitly
    /// raised via a configuration profile or `log` CLI tool.
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func debug(_ message: OSLogMessage) {
        logger.debug("\(message)")
    }

    /// Logs a message at the **info** level.
    ///
    /// Info-level messages persist in the log store but are not shown in
    /// Console.app's live stream unless the level filter is lowered.
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func info(_ message: OSLogMessage) {
        logger.info("\(message)")
    }

    /// Logs a message at the **notice** (default) level.
    ///
    /// Notice is the standard level for messages that are relevant during
    /// normal operation but are not warnings or errors.
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func notice(_ message: OSLogMessage) {
        logger.notice("\(message)")
    }

    /// Logs a message at the **warning** level.
    ///
    /// Use for recoverable issues that deserve attention during triage
    /// (e.g. network retry, missing optional field).
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func warning(_ message: OSLogMessage) {
        logger.warning("\(message)")
    }

    /// Logs a message at the **error** level.
    ///
    /// Errors indicate failures that affect user-visible behaviour and
    /// should be investigated promptly.
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func error(_ message: OSLogMessage) {
        logger.error("\(message)")
    }

    /// Logs a message at the **fault** level.
    ///
    /// Faults represent programming errors or unexpected states that
    /// should never occur. These persist in the log store indefinitely.
    /// - Parameter message: An `OSLogMessage`-compatible interpolated string.
    public func fault(_ message: OSLogMessage) {
        logger.fault("\(message)")
    }

    // MARK: - Signpost Helpers

    /// The signpost log used for Instruments performance traces.
    private static let signpostLog = OSSignposter(subsystem: subsystem, category: "Performance")

    /// Begins an Instruments signpost interval.
    ///
    /// Pair with ``endSignpost(_:id:)`` to visualize the duration of a
    /// discrete operation in Instruments' Points of Interest track.
    /// - Parameter name: A compile-time constant describing the interval.
    /// - Returns: A signpost ID to pass to the matching end call.
    public static func beginSignpost(_ name: StaticString) -> OSSignpostID {
        let id = signpostLog.makeSignpostID()
        signpostLog.beginInterval(name, id: id)
        return id
    }

    /// Ends a previously started signpost interval.
    /// - Parameters:
    ///   - name: Must match the name passed to ``beginSignpost(_:)``.
    ///   - id: The ID returned by the corresponding begin call.
    public static func endSignpost(_ name: StaticString, id: OSSignpostID) {
        signpostLog.endInterval(name, id)
    }
}

// MARK: - Predefined Loggers

extension RallyLogger {

    /// Logger for authentication flows.
    public static let auth = RallyLogger(category: "Auth")

    /// Logger for networking and API communication.
    public static let networking = RallyLogger(category: "Networking")

    /// Logger for analytics event pipeline.
    public static let analytics = RallyLogger(category: "Analytics")

    /// Logger for location and venue detection.
    public static let location = RallyLogger(category: "Location")

    /// Logger for gameday activations.
    public static let gameday = RallyLogger(category: "Gameday")

    /// Logger for loyalty points and rewards.
    public static let loyalty = RallyLogger(category: "Loyalty")

    /// Logger for push notifications.
    public static let notifications = RallyLogger(category: "Notifications")

    /// Logger for sponsor impressions and content.
    public static let sponsors = RallyLogger(category: "Sponsors")

    /// Logger for general UI lifecycle events.
    public static let ui = RallyLogger(category: "UI")
}
