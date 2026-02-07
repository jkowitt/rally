import Foundation
import CoreLocation
import os
import RallyCore

// MARK: - BeaconManager

/// Manages iBeacon ranging using `CLBeaconIdentityConstraint`.
///
/// Ranging starts when the user enters a venue geofence and stops on exit.
/// Beacon observations are surfaced as an `AsyncStream<BeaconReading>` so that
/// callers can consume them with `for await`.
///
/// This class is `@unchecked Sendable` because its mutable state is protected
/// by a serial dispatch queue, and the CLLocationManager delegate callbacks
/// are forwarded from that queue.
public final class BeaconManager: NSObject, @unchecked Sendable {

    // MARK: - Properties

    private let clManager: CLLocationManager
    private let logger = Logger(subsystem: "com.rally.location", category: "BeaconManager")

    /// Active beacon constraints being ranged, keyed by their UUID string.
    private var activeConstraints: [String: CLBeaconIdentityConstraint] = [:]

    /// Stream continuation for broadcasting beacon readings.
    private var beaconStreamContinuation: AsyncStream<BeaconReading>.Continuation?

    /// Serial queue protecting mutable state.
    private let stateQueue = DispatchQueue(label: "com.rally.location.beaconStateQueue")

    /// Tracks whether the manager has been started (for idempotency guards).
    private var isRanging = false

    // MARK: - Initialization

    public override init() {
        self.clManager = CLLocationManager()
        super.init()
        clManager.delegate = self
        clManager.allowsBackgroundLocationUpdates = true
    }

    // MARK: - Ranging Control

    /// Begins ranging beacons that match the given constraint.
    ///
    /// Typically called when the user enters a venue geofence whose `Venue` has
    /// a `beaconUUID` configured.
    ///
    /// - Parameter constraint: A `CLBeaconIdentityConstraint` specifying the UUID
    ///   (and optionally major/minor) to range.
    /// - Parameter venueID: The venue identifier, used as a key for bookkeeping.
    public func startRanging(constraint: CLBeaconIdentityConstraint, venueID: String) {
        guard CLLocationManager.isRangingAvailable() else {
            logger.warning("Beacon ranging is not available on this device")
            return
        }

        stateQueue.sync {
            guard activeConstraints[venueID] == nil else {
                logger.debug("Already ranging for venue \(venueID)")
                return
            }
            activeConstraints[venueID] = constraint
        }

        clManager.startRangingBeacons(satisfying: constraint)
        logger.info("Started ranging beacons for venue \(venueID) with UUID \(constraint.uuid)")

        stateQueue.sync { isRanging = !activeConstraints.isEmpty }
    }

    /// Stops ranging beacons for the specified venue.
    ///
    /// - Parameter venueID: The venue identifier whose beacon constraint should be removed.
    public func stopRanging(venueID: String) {
        var constraint: CLBeaconIdentityConstraint?

        stateQueue.sync {
            constraint = activeConstraints.removeValue(forKey: venueID)
            isRanging = !activeConstraints.isEmpty
        }

        if let constraint {
            clManager.stopRangingBeacons(satisfying: constraint)
            logger.info("Stopped ranging beacons for venue \(venueID)")
        }
    }

    /// Stops all active beacon ranging.
    public func stopAllRanging() {
        let constraints: [String: CLBeaconIdentityConstraint] = stateQueue.sync {
            let copy = activeConstraints
            activeConstraints.removeAll()
            isRanging = false
            return copy
        }

        for (venueID, constraint) in constraints {
            clManager.stopRangingBeacons(satisfying: constraint)
            logger.info("Stopped ranging beacons for venue \(venueID)")
        }
    }

    /// Whether any beacon constraints are currently being ranged.
    public var isActivelyRanging: Bool {
        stateQueue.sync { isRanging }
    }

    // MARK: - Beacon Event Stream

    /// Returns an `AsyncStream` of `BeaconReading` values observed during ranging.
    ///
    /// Only one active stream is supported. Calling this again replaces the previous stream.
    public func beaconReadings() -> AsyncStream<BeaconReading> {
        stateQueue.sync { beaconStreamContinuation?.finish() }

        return AsyncStream { continuation in
            stateQueue.sync { self.beaconStreamContinuation = continuation }
            continuation.onTermination = { @Sendable [weak self] _ in
                self?.stateQueue.sync { self?.beaconStreamContinuation = nil }
            }
        }
    }

    // MARK: - Helpers

    /// Converts a `CLBeacon` to a `BeaconReading`.
    private func makeReading(from beacon: CLBeacon) -> BeaconReading {
        BeaconReading(
            uuid: beacon.uuid,
            major: beacon.major.uint16Value,
            minor: beacon.minor.uint16Value,
            proximity: BeaconProximityLevel(clProximity: beacon.proximity),
            accuracy: beacon.accuracy,
            rssi: beacon.rssi,
            timestamp: .now
        )
    }
}

// MARK: - CLLocationManagerDelegate

extension BeaconManager: CLLocationManagerDelegate {

    public func locationManager(
        _ manager: CLLocationManager,
        didRange beacons: [CLBeacon],
        satisfying beaconConstraint: CLBeaconIdentityConstraint
    ) {
        guard !beacons.isEmpty else { return }

        let readings = beacons.map(makeReading)

        stateQueue.sync {
            for reading in readings {
                beaconStreamContinuation?.yield(reading)
            }
        }

        logger.debug("Ranged \(beacons.count) beacon(s) for constraint \(beaconConstraint.uuid)")
    }

    public func locationManager(
        _ manager: CLLocationManager,
        didFailRangingFor beaconConstraint: CLBeaconIdentityConstraint,
        error: any Error
    ) {
        logger.error("Beacon ranging failed for \(beaconConstraint.uuid): \(error.localizedDescription)")
    }
}
