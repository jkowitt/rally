import Foundation
import Network
import OSLog

/// Wraps `NWPathMonitor` to provide a reactive, Sendable-compliant
/// connectivity signal for the rest of the networking layer.
///
/// The monitor runs on a dedicated dispatch queue so path updates are
/// delivered off the main thread. Consumers can check ``isConnected``
/// synchronously or `await` the ``connectionStatusStream`` for
/// real-time updates.
///
/// Usage:
/// ```swift
/// let monitor = NetworkMonitor()
/// await monitor.start()
/// if await monitor.isConnected {
///     // proceed with request
/// }
/// ```
public actor NetworkMonitor {

    // MARK: - Types

    /// Describes the current network connectivity status.
    public enum ConnectionStatus: Sendable, Equatable {
        case connected
        case disconnected
        case requiresConnection
    }

    /// Describes the interface type of the current path.
    public enum InterfaceType: Sendable, Equatable {
        case wifi
        case cellular
        case wiredEthernet
        case other
        case none
    }

    // MARK: - Properties

    private static let logger = Logger(
        subsystem: "app.rally.networking",
        category: "NetworkMonitor"
    )

    private let monitor: NWPathMonitor
    private let monitorQueue: DispatchQueue

    private var currentPath: NWPath?
    private var statusContinuations: [UUID: AsyncStream<ConnectionStatus>.Continuation] = [:]

    // MARK: - Published State

    /// Whether the device currently has a usable network path.
    public private(set) var isConnected: Bool = false

    /// The type of network interface currently in use.
    public private(set) var interfaceType: InterfaceType = .none

    /// The current connection status.
    public private(set) var status: ConnectionStatus = .disconnected

    /// Whether the current path is considered expensive (e.g., cellular
    /// or personal hotspot).
    public var isExpensive: Bool {
        currentPath?.isExpensive ?? false
    }

    /// Whether the current path is constrained (e.g., Low Data Mode).
    public var isConstrained: Bool {
        currentPath?.isConstrained ?? false
    }

    // MARK: - Initialization

    /// Creates a new network monitor.
    ///
    /// - Parameter queue: The dispatch queue for path update callbacks.
    ///   Defaults to a dedicated serial queue.
    public init(queue: DispatchQueue = DispatchQueue(label: "app.rally.network-monitor", qos: .utility)) {
        self.monitor = NWPathMonitor()
        self.monitorQueue = queue
    }

    // MARK: - Lifecycle

    /// Starts monitoring network path changes.
    ///
    /// This method is idempotent; calling it multiple times has no
    /// additional effect.
    public func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self else { return }
            Task {
                await self.handlePathUpdate(path)
            }
        }
        monitor.start(queue: monitorQueue)
        Self.logger.debug("Network monitoring started")
    }

    /// Stops monitoring and cancels the underlying `NWPathMonitor`.
    public func stop() {
        monitor.cancel()
        for (id, continuation) in statusContinuations {
            continuation.finish()
            statusContinuations.removeValue(forKey: id)
        }
        Self.logger.debug("Network monitoring stopped")
    }

    // MARK: - Observation

    /// An `AsyncStream` that emits ``ConnectionStatus`` values whenever
    /// the network path changes. Multiple consumers can each create their
    /// own stream.
    public var connectionStatusStream: AsyncStream<ConnectionStatus> {
        let id = UUID()
        return AsyncStream { continuation in
            statusContinuations[id] = continuation

            // Emit current status immediately so callers don't have
            // to wait for the next change.
            continuation.yield(status)

            continuation.onTermination = { [weak self] _ in
                guard let self else { return }
                Task { await self.removeContinuation(id: id) }
            }
        }
    }

    // MARK: - Private

    private func removeContinuation(id: UUID) {
        statusContinuations.removeValue(forKey: id)
    }

    private func handlePathUpdate(_ path: NWPath) {
        currentPath = path

        let newStatus: ConnectionStatus
        switch path.status {
        case .satisfied:
            newStatus = .connected
        case .requiresConnection:
            newStatus = .requiresConnection
        case .unsatisfied:
            newStatus = .disconnected
        @unknown default:
            newStatus = .disconnected
        }

        let newInterfaceType: InterfaceType
        if path.usesInterfaceType(.wifi) {
            newInterfaceType = .wifi
        } else if path.usesInterfaceType(.cellular) {
            newInterfaceType = .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            newInterfaceType = .wiredEthernet
        } else if path.status == .satisfied {
            newInterfaceType = .other
        } else {
            newInterfaceType = .none
        }

        let previousStatus = status
        isConnected = path.status == .satisfied
        interfaceType = newInterfaceType
        status = newStatus

        if previousStatus != newStatus {
            Self.logger.info(
                "Network status changed: \(String(describing: previousStatus)) → \(String(describing: newStatus)), interface: \(String(describing: newInterfaceType)), expensive: \(path.isExpensive)"
            )

            for continuation in statusContinuations.values {
                continuation.yield(newStatus)
            }
        }
    }
}
