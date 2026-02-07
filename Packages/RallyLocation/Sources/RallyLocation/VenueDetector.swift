import Foundation
import CoreLocation
import os
import RallyCore

// MARK: - VenueDetector

/// Orchestrates geofence monitoring, iBeacon ranging, and BLE scanning to produce
/// a unified `AsyncStream<VenueEvent>` describing venue enter/exit transitions and
/// proximity beacon detections.
///
/// **Lifecycle:**
/// 1. Call `start(venues:)` to begin monitoring a set of venues (up to 20).
/// 2. Consume `events` to receive `VenueEvent` values.
/// 3. On geofence entry, beacon ranging is started automatically for venues with a `beaconUUID`.
///    If beacon ranging is unavailable, falls back to BLE Eddystone scanning.
/// 4. On geofence exit, ranging/scanning for that venue stops.
/// 5. Call `stop()` to tear down all monitoring.
///
/// This actor isolates all mutable state to a single cooperative executor.
public actor VenueDetector {

    // MARK: - Dependencies

    private let locationManager: LocationManager
    private let beaconManager: BeaconManager
    private let bleScanner: BLEScanner
    private let logger = Logger(subsystem: "com.rally.location", category: "VenueDetector")

    // MARK: - State

    /// All venues being monitored, keyed by venue ID.
    private var monitoredVenues: [String: MonitoredVenue] = [:]

    /// Tracks which venues the user is currently inside.
    private var venuesInside: Set<String> = []

    /// The unified output stream continuation.
    private var eventContinuation: AsyncStream<VenueEvent>.Continuation?

    /// Handle to the geofence observation task.
    private var geofenceTask: Task<Void, Never>?

    /// Handle to the beacon observation task.
    private var beaconTask: Task<Void, Never>?

    /// Handle to the BLE observation task.
    private var bleTask: Task<Void, Never>?

    /// Whether the detector has been started.
    private var isRunning = false

    // MARK: - Public Stream

    /// The backing `AsyncStream` that callers iterate with `for await`.
    /// Set once in `start(venues:)`.
    private var _events: AsyncStream<VenueEvent>?

    /// An `AsyncStream` of `VenueEvent` values representing venue transitions and beacon detections.
    ///
    /// Returns `nil` if the detector has not been started.
    public var events: AsyncStream<VenueEvent>? {
        _events
    }

    // MARK: - Initialization

    /// Creates a VenueDetector with the given sub-managers.
    ///
    /// - Parameters:
    ///   - locationManager: The geofence manager. Defaults to a new instance.
    ///   - beaconManager: The iBeacon manager. Defaults to a new instance.
    ///   - bleScanner: The Eddystone BLE scanner. Defaults to a new instance.
    public init(
        locationManager: LocationManager = LocationManager(),
        beaconManager: BeaconManager = BeaconManager(),
        bleScanner: BLEScanner = BLEScanner()
    ) {
        self.locationManager = locationManager
        self.beaconManager = beaconManager
        self.bleScanner = bleScanner
    }

    // MARK: - Start / Stop

    /// Begins monitoring the given venues for geofence transitions and beacon proximity.
    ///
    /// - Parameter venues: The venues to monitor. At most `LocationManager.maxMonitoredRegions`
    ///   venues will be registered; extras are silently dropped.
    /// - Returns: An `AsyncStream<VenueEvent>` for consuming events.
    @discardableResult
    public func start(venues: [Venue]) async throws -> AsyncStream<VenueEvent> {
        guard !isRunning else {
            logger.warning("VenueDetector is already running")
            if let existing = _events { return existing }
            return AsyncStream { $0.finish() }
        }

        isRunning = true

        // Build the unified output stream.
        let stream = AsyncStream<VenueEvent> { continuation in
            self.eventContinuation = continuation
            continuation.onTermination = { @Sendable [weak self] _ in
                guard let self else { return }
                Task { await self.handleStreamTermination() }
            }
        }
        _events = stream

        // Register geofence regions (respect the 20-region cap).
        let capped = Array(venues.prefix(LocationManager.maxMonitoredRegions))
        for venue in capped {
            let monitored = MonitoredVenue(venue: venue)
            monitoredVenues[venue.id] = monitored
            do {
                try await locationManager.startMonitoring(for: monitored)
            } catch {
                logger.error("Failed to monitor venue \(venue.id): \(error.localizedDescription)")
            }
        }

        // Start significant location changes for battery-efficient background wake-ups.
        locationManager.startSignificantLocationChangeMonitoring()

        // Observe geofence events.
        geofenceTask = Task { [weak self] in
            guard let self else { return }
            let geofenceStream = locationManager.geofenceEvents()
            for await event in geofenceStream {
                guard !Task.isCancelled else { break }
                await self.handleGeofenceEvent(event)
            }
        }

        // Observe beacon readings.
        beaconTask = Task { [weak self] in
            guard let self else { return }
            let beaconStream = beaconManager.beaconReadings()
            for await reading in beaconStream {
                guard !Task.isCancelled else { break }
                await self.handleBeaconReading(reading)
            }
        }

        // Observe BLE readings.
        bleTask = Task { [weak self] in
            guard let self else { return }
            let bleStream = bleScanner.bleReadings()
            for await reading in bleStream {
                guard !Task.isCancelled else { break }
                await self.handleBLEReading(reading)
            }
        }

        logger.info("VenueDetector started with \(capped.count) venue(s)")
        return stream
    }

    /// Tears down all monitoring, ranging, scanning, and cancels observation tasks.
    public func stop() {
        guard isRunning else { return }
        isRunning = false

        // Cancel observation tasks.
        geofenceTask?.cancel()
        beaconTask?.cancel()
        bleTask?.cancel()
        geofenceTask = nil
        beaconTask = nil
        bleTask = nil

        // Stop all subsystems.
        locationManager.stopMonitoringAllRegions()
        locationManager.stopSignificantLocationChangeMonitoring()
        beaconManager.stopAllRanging()
        bleScanner.stopScanning()

        // Clean up state.
        monitoredVenues.removeAll()
        venuesInside.removeAll()

        // Close the output stream.
        eventContinuation?.finish()
        eventContinuation = nil
        _events = nil

        logger.info("VenueDetector stopped")
    }

    // MARK: - Event Handling

    /// Processes a geofence event: starts/stops beacon ranging on entry/exit.
    private func handleGeofenceEvent(_ event: VenueEvent) {
        // Forward the event downstream.
        eventContinuation?.yield(event)

        switch event {
        case .entered(let venueID, _):
            guard !venuesInside.contains(venueID) else { return }
            venuesInside.insert(venueID)
            startProximityDetection(for: venueID)

        case .exited(let venueID, _):
            venuesInside.remove(venueID)
            stopProximityDetection(for: venueID)

        case .beaconDetected, .bleFrameDetected:
            // These events are generated by beacon/BLE tasks, not geofence.
            break
        }
    }

    /// Starts iBeacon ranging (or BLE fallback) for the given venue.
    private func startProximityDetection(for venueID: String) {
        guard let monitored = monitoredVenues[venueID] else { return }

        if let constraint = monitored.beaconConstraint {
            // Prefer iBeacon ranging when the venue has a beacon UUID.
            beaconManager.startRanging(constraint: constraint, venueID: venueID)
            logger.info("Started beacon ranging for venue \(venueID)")
        } else {
            // Fall back to BLE Eddystone scanning.
            Task {
                do {
                    try await bleScanner.startScanning()
                    logger.info("Started BLE fallback scanning for venue \(venueID)")
                } catch {
                    logger.error("BLE fallback failed for venue \(venueID): \(error.localizedDescription)")
                }
            }
        }
    }

    /// Stops proximity detection for the given venue.
    private func stopProximityDetection(for venueID: String) {
        guard let monitored = monitoredVenues[venueID] else { return }

        if monitored.beaconConstraint != nil {
            beaconManager.stopRanging(venueID: venueID)
            logger.info("Stopped beacon ranging for venue \(venueID)")
        } else {
            // Only stop BLE scanning if no other venue needs it.
            let otherVenuesNeedBLE = venuesInside.contains { otherID in
                otherID != venueID && monitoredVenues[otherID]?.beaconConstraint == nil
            }
            if !otherVenuesNeedBLE {
                bleScanner.stopScanning()
                logger.info("Stopped BLE fallback scanning (no remaining venues need it)")
            }
        }
    }

    /// Routes a beacon reading to the correct venue and forwards as a VenueEvent.
    private func handleBeaconReading(_ reading: BeaconReading) {
        // Find the venue whose beacon UUID matches this reading.
        let matchingVenueID = monitoredVenues.first { _, monitored in
            guard let uuidString = monitored.venue.beaconUUID,
                  let venueUUID = UUID(uuidString: uuidString) else { return false }
            return venueUUID == reading.uuid
        }?.key

        guard let venueID = matchingVenueID else { return }

        let event = VenueEvent.beaconDetected(venueID: venueID, reading: reading)
        eventContinuation?.yield(event)
    }

    /// Routes a BLE reading as a venue event for any venue the user is currently inside.
    private func handleBLEReading(_ reading: BLEReading) {
        // Emit BLE detection for each venue the user is inside that lacks beacon support.
        for venueID in venuesInside {
            guard let monitored = monitoredVenues[venueID],
                  monitored.beaconConstraint == nil else { continue }
            let event = VenueEvent.bleFrameDetected(venueID: venueID, reading: reading)
            eventContinuation?.yield(event)
        }
    }

    /// Cleanup when the output stream is terminated externally.
    private func handleStreamTermination() {
        stop()
    }

    // MARK: - Query

    /// Returns the set of venue IDs the user is currently detected inside.
    public var currentVenueIDs: Set<String> {
        venuesInside
    }

    /// Whether the detector is actively monitoring venues.
    public var isActive: Bool {
        isRunning
    }

    /// The number of venues currently being monitored.
    public var monitoredVenueCount: Int {
        monitoredVenues.count
    }
}

// MARK: - LocationServiceProtocol Conformance

/// Adapter that conforms the VenueDetector to RallyCore's `LocationServiceProtocol`,
/// allowing it to be injected into the app's dependency container.
public final class VenueDetectorService: @unchecked Sendable, LocationServiceProtocol {

    private let detector: VenueDetector
    private let locationManager: LocationManager

    public init(detector: VenueDetector, locationManager: LocationManager = LocationManager()) {
        self.detector = detector
        self.locationManager = locationManager
    }

    public func requestPermission() async -> LocationPermissionStatus {
        await locationManager.requestPermission()
    }

    public func startMonitoringVenue(_ venue: Venue) async {
        let monitored = MonitoredVenue(venue: venue)
        try? await locationManager.startMonitoring(for: monitored)
    }

    public func stopMonitoringVenue(_ venue: Venue) async {
        let monitored = MonitoredVenue(venue: venue)
        locationManager.stopMonitoring(for: monitored)
    }

    public func startBeaconRanging(uuid: String) async {
        guard let beaconUUID = UUID(uuidString: uuid) else { return }
        let constraint = CLBeaconIdentityConstraint(uuid: beaconUUID)
        let beaconManager = BeaconManager()
        beaconManager.startRanging(constraint: constraint, venueID: uuid)
    }

    public func stopBeaconRanging() async {
        // Handled by VenueDetector lifecycle; stop is a no-op at the protocol level.
    }

    public func currentLocation() async throws -> (latitude: Double, longitude: Double) {
        let location = try await locationManager.currentLocation()
        return (latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
    }
}
