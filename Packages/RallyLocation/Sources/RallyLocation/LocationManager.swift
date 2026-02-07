import Foundation
import CoreLocation
import os
import RallyCore

// MARK: - LocationManager

/// Actor-isolated wrapper around CLLocationManager that exposes async/await APIs
/// for permission requests, one-shot location fetches, and geofence region monitoring.
///
/// Bridges CLLocationManagerDelegate callbacks to Swift concurrency using
/// checked continuations and AsyncStream.
public final class LocationManager: NSObject, @unchecked Sendable {

    // MARK: - Properties

    private let clManager: CLLocationManager
    private let logger = Logger(subsystem: "com.rally.location", category: "LocationManager")

    /// Maximum number of CLCircularRegions the system allows simultaneously.
    public static let maxMonitoredRegions = 20

    // MARK: Continuation Storage

    /// Pending continuation for a one-shot permission request.
    private var permissionContinuation: CheckedContinuation<LocationPermissionStatus, Never>?

    /// Pending continuation for a one-shot location request.
    private var locationContinuation: CheckedContinuation<CLLocation, any Error>?

    /// Continuations waiting for region monitoring start confirmation or failure.
    private var regionStartContinuations: [String: CheckedContinuation<Void, any Error>] = [:]

    /// Stream continuation for broadcasting geofence events to observers.
    private var geofenceStreamContinuation: AsyncStream<VenueEvent>.Continuation?

    /// Serial queue to protect mutable delegate state from data races.
    private let stateQueue = DispatchQueue(label: "com.rally.location.stateQueue")

    // MARK: - Initialization

    public override init() {
        self.clManager = CLLocationManager()
        super.init()
        clManager.delegate = self
        clManager.desiredAccuracy = kCLLocationAccuracyBest
        clManager.allowsBackgroundLocationUpdates = true
        clManager.pausesLocationUpdatesAutomatically = false
        clManager.showsBackgroundLocationIndicator = true
    }

    // MARK: - Permission

    /// Requests location permission using the progressive model.
    /// First requests `.whenInUse`; if already granted, escalates to `.always`.
    public func requestPermission() async -> LocationPermissionStatus {
        let current = clManager.authorizationStatus

        switch current {
        case .authorizedAlways:
            return .authorized
        case .authorizedWhenInUse:
            // Escalate to always for background geofencing.
            return await withCheckedContinuation { continuation in
                stateQueue.sync { self.permissionContinuation = continuation }
                DispatchQueue.main.async { [weak self] in
                    self?.clManager.requestAlwaysAuthorization()
                }
            }
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                stateQueue.sync { self.permissionContinuation = continuation }
                DispatchQueue.main.async { [weak self] in
                    self?.clManager.requestWhenInUseAuthorization()
                }
            }
        case .denied:
            return .denied
        case .restricted:
            return .restricted
        @unknown default:
            return .notDetermined
        }
    }

    // MARK: - One-shot Location

    /// Returns the device's current location as a single async result.
    /// Times out after the specified interval.
    public func currentLocation(timeout: TimeInterval = 10) async throws -> CLLocation {
        try await withCheckedThrowingContinuation { continuation in
            stateQueue.sync { self.locationContinuation = continuation }

            DispatchQueue.main.async { [weak self] in
                self?.clManager.requestLocation()
            }

            // Schedule a timeout on the state queue.
            stateQueue.asyncAfter(deadline: .now() + timeout) { [weak self] in
                guard let self else { return }
                if let pending = self.locationContinuation {
                    self.locationContinuation = nil
                    pending.resume(throwing: LocationError.timeout)
                }
            }
        }
    }

    // MARK: - Geofence Monitoring

    /// Begins monitoring a circular geofence region for the given venue.
    /// Throws if the system region limit would be exceeded.
    public func startMonitoring(for venue: MonitoredVenue) async throws {
        let monitoredCount = clManager.monitoredRegions.count
        guard monitoredCount < Self.maxMonitoredRegions else {
            throw LocationError.regionLimitExceeded(max: Self.maxMonitoredRegions)
        }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            stateQueue.sync {
                self.regionStartContinuations[venue.region.identifier] = continuation
            }
            DispatchQueue.main.async { [weak self] in
                self?.clManager.startMonitoring(for: venue.region)
            }
        }

        logger.info("Started monitoring region for venue \(venue.venue.id)")
    }

    /// Stops monitoring the geofence region for the given venue.
    public func stopMonitoring(for venue: MonitoredVenue) {
        clManager.stopMonitoring(for: venue.region)
        logger.info("Stopped monitoring region for venue \(venue.venue.id)")
    }

    /// Stops monitoring all regions.
    public func stopMonitoringAllRegions() {
        for region in clManager.monitoredRegions {
            clManager.stopMonitoring(for: region)
        }
        logger.info("Stopped monitoring all regions")
    }

    /// The set of region identifiers currently being monitored.
    public var monitoredRegionIdentifiers: Set<String> {
        Set(clManager.monitoredRegions.map(\.identifier))
    }

    // MARK: - Significant Location Changes

    /// Starts significant location change monitoring for battery-efficient background updates.
    public func startSignificantLocationChangeMonitoring() {
        guard CLLocationManager.significantLocationChangeMonitoringAvailable() else {
            logger.warning("Significant location change monitoring not available")
            return
        }
        clManager.startMonitoringSignificantLocationChanges()
        logger.info("Started significant location change monitoring")
    }

    /// Stops significant location change monitoring.
    public func stopSignificantLocationChangeMonitoring() {
        clManager.stopMonitoringSignificantLocationChanges()
        logger.info("Stopped significant location change monitoring")
    }

    // MARK: - Geofence Event Stream

    /// Returns an `AsyncStream` of venue enter/exit events from geofence monitoring.
    /// Only one active stream is supported at a time; calling again replaces the previous stream.
    public func geofenceEvents() -> AsyncStream<VenueEvent> {
        // Terminate any existing stream before creating a new one.
        stateQueue.sync { geofenceStreamContinuation?.finish() }

        return AsyncStream { continuation in
            stateQueue.sync { self.geofenceStreamContinuation = continuation }
            continuation.onTermination = { @Sendable [weak self] _ in
                self?.stateQueue.sync { self?.geofenceStreamContinuation = nil }
            }
        }
    }

    // MARK: - Helpers

    /// Maps CLAuthorizationStatus to the RallyCore LocationPermissionStatus.
    private func mapAuthorizationStatus(_ status: CLAuthorizationStatus) -> LocationPermissionStatus {
        switch status {
        case .authorizedAlways:    return .authorized
        case .authorizedWhenInUse: return .authorizedWhenInUse
        case .denied:              return .denied
        case .restricted:          return .restricted
        case .notDetermined:       return .notDetermined
        @unknown default:          return .notDetermined
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: CLLocationManagerDelegate {

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let mapped = mapAuthorizationStatus(manager.authorizationStatus)
        logger.debug("Authorization changed to \(String(describing: mapped))")

        stateQueue.sync {
            if let continuation = permissionContinuation {
                permissionContinuation = nil
                continuation.resume(returning: mapped)
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        stateQueue.sync {
            if let continuation = locationContinuation {
                locationContinuation = nil
                continuation.resume(returning: location)
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: any Error) {
        logger.error("Location manager error: \(error.localizedDescription)")

        stateQueue.sync {
            if let continuation = locationContinuation {
                locationContinuation = nil
                continuation.resume(throwing: LocationError.locationUnavailable)
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didStartMonitoringFor region: CLRegion) {
        stateQueue.sync {
            if let continuation = regionStartContinuations.removeValue(forKey: region.identifier) {
                continuation.resume()
            }
        }
        // Request the initial state so we know if the user is already inside.
        manager.requestState(for: region)
    }

    public func locationManager(
        _ manager: CLLocationManager,
        monitoringDidFailFor region: CLRegion?,
        withError error: any Error
    ) {
        let identifier = region?.identifier ?? "unknown"
        logger.error("Region monitoring failed for \(identifier): \(error.localizedDescription)")

        stateQueue.sync {
            if let continuation = regionStartContinuations.removeValue(forKey: identifier) {
                continuation.resume(throwing: LocationError.regionMonitoringFailed(identifier))
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard let circular = region as? CLCircularRegion else { return }
        let event = VenueEvent.entered(venueID: circular.identifier, timestamp: .now)
        logger.info("Entered region \(circular.identifier)")

        stateQueue.sync {
            geofenceStreamContinuation?.yield(event)
        }
    }

    public func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard let circular = region as? CLCircularRegion else { return }
        let event = VenueEvent.exited(venueID: circular.identifier, timestamp: .now)
        logger.info("Exited region \(circular.identifier)")

        stateQueue.sync {
            geofenceStreamContinuation?.yield(event)
        }
    }

    public func locationManager(_ manager: CLLocationManager, didDetermineState state: CLRegionState, for region: CLRegion) {
        guard let circular = region as? CLCircularRegion else { return }

        switch state {
        case .inside:
            let event = VenueEvent.entered(venueID: circular.identifier, timestamp: .now)
            stateQueue.sync { geofenceStreamContinuation?.yield(event) }
        case .outside:
            let event = VenueEvent.exited(venueID: circular.identifier, timestamp: .now)
            stateQueue.sync { geofenceStreamContinuation?.yield(event) }
        case .unknown:
            break
        }
    }
}
