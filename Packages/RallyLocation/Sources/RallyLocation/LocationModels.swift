import Foundation
import CoreLocation
import RallyCore

// MARK: - Venue Events

/// Describes a venue proximity transition detected by the location subsystem.
public enum VenueEvent: Sendable, Hashable {
    /// The user entered the geofence region of a venue.
    case entered(venueID: String, timestamp: Date)
    /// The user exited the geofence region of a venue.
    case exited(venueID: String, timestamp: Date)
    /// A beacon was detected inside the venue, providing proximity proof.
    case beaconDetected(venueID: String, reading: BeaconReading)
    /// An Eddystone BLE frame was detected as a fallback signal.
    case bleFrameDetected(venueID: String, reading: BLEReading)

    public var venueID: String {
        switch self {
        case .entered(let id, _),
             .exited(let id, _),
             .beaconDetected(let id, _),
             .bleFrameDetected(let id, _):
            return id
        }
    }
}

// MARK: - Beacon Reading

/// A single iBeacon observation captured during ranging.
public struct BeaconReading: Sendable, Hashable {
    public let uuid: UUID
    public let major: UInt16
    public let minor: UInt16
    public let proximity: BeaconProximityLevel
    public let accuracy: Double
    public let rssi: Int
    public let timestamp: Date

    public init(
        uuid: UUID,
        major: UInt16,
        minor: UInt16,
        proximity: BeaconProximityLevel,
        accuracy: Double,
        rssi: Int,
        timestamp: Date = .now
    ) {
        self.uuid = uuid
        self.major = major
        self.minor = minor
        self.proximity = proximity
        self.accuracy = accuracy
        self.rssi = rssi
        self.timestamp = timestamp
    }
}

/// Mirrors CLProximity but is Sendable-safe and transport-friendly.
public enum BeaconProximityLevel: String, Sendable, Hashable, Codable {
    case immediate
    case near
    case far
    case unknown

    public init(clProximity: CLProximity) {
        switch clProximity {
        case .immediate: self = .immediate
        case .near:      self = .near
        case .far:       self = .far
        case .unknown:   self = .unknown
        @unknown default: self = .unknown
        }
    }
}

// MARK: - BLE Reading

/// A single Eddystone BLE advertisement observation.
public struct BLEReading: Sendable, Hashable {
    public let namespaceID: String
    public let instanceID: String
    public let rssi: Int
    public let txPower: Int
    public let timestamp: Date

    public init(
        namespaceID: String,
        instanceID: String,
        rssi: Int,
        txPower: Int,
        timestamp: Date = .now
    ) {
        self.namespaceID = namespaceID
        self.instanceID = instanceID
        self.rssi = rssi
        self.txPower = txPower
        self.timestamp = timestamp
    }

    /// Estimated distance in meters from the BLE transmitter using the log-distance path loss model.
    public var estimatedDistance: Double {
        guard txPower != 0, rssi != 0 else { return -1 }
        let ratio = Double(txPower - rssi) / 20.0
        return pow(10.0, ratio)
    }
}

// MARK: - Monitored Venue

/// Internal representation of a venue being actively monitored for geofence and beacon events.
public struct MonitoredVenue: Sendable, Hashable {
    public let venue: Venue
    public let region: CLCircularRegion
    public let beaconConstraint: CLBeaconIdentityConstraint?

    public init(venue: Venue) {
        self.venue = venue

        let center = CLLocationCoordinate2D(latitude: venue.latitude, longitude: venue.longitude)
        let radius = min(venue.radiusMeters, CLLocationManager().maximumRegionMonitoringDistance)
        let region = CLCircularRegion(center: center, radius: radius, identifier: venue.id)
        region.notifyOnEntry = true
        region.notifyOnExit = true
        self.region = region

        if let uuidString = venue.beaconUUID, let uuid = UUID(uuidString: uuidString) {
            if let major = venue.beaconMajor {
                self.beaconConstraint = CLBeaconIdentityConstraint(uuid: uuid, major: major)
            } else {
                self.beaconConstraint = CLBeaconIdentityConstraint(uuid: uuid)
            }
        } else {
            self.beaconConstraint = nil
        }
    }
}

// MARK: - Location Error

/// Errors specific to the RallyLocation subsystem.
public enum LocationError: Error, Sendable {
    case permissionDenied
    case permissionRestricted
    case locationUnavailable
    case regionMonitoringFailed(String)
    case beaconRangingUnavailable
    case bluetoothUnavailable
    case bluetoothUnauthorized
    case regionLimitExceeded(max: Int)
    case timeout
}

// MARK: - Geofence State

/// Tracks the current state of a monitored geofence region.
public enum GeofenceState: Sendable, Hashable {
    case inside
    case outside
    case unknown
}
