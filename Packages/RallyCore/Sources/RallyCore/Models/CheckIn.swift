import Foundation

/// Represents a venue check-in with proof of attendance.
public struct CheckIn: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let userID: String
    public let eventID: String
    public let venueID: String
    public let timestamp: Date
    public let proof: CheckInProof
    public let pointsEarned: Int
    public let status: CheckInStatus

    public init(
        id: String,
        userID: String,
        eventID: String,
        venueID: String,
        timestamp: Date = .now,
        proof: CheckInProof,
        pointsEarned: Int = 0,
        status: CheckInStatus = .pending
    ) {
        self.id = id
        self.userID = userID
        self.eventID = eventID
        self.venueID = venueID
        self.timestamp = timestamp
        self.proof = proof
        self.pointsEarned = pointsEarned
        self.status = status
    }
}

public struct CheckInProof: Codable, Hashable, Sendable {
    public let latitude: Double
    public let longitude: Double
    public let horizontalAccuracy: Double
    public let beaconUUID: String?
    public let beaconMajor: UInt16?
    public let beaconMinor: UInt16?
    public let beaconProximity: String?
    public let attestationToken: String?

    public init(
        latitude: Double,
        longitude: Double,
        horizontalAccuracy: Double,
        beaconUUID: String? = nil,
        beaconMajor: UInt16? = nil,
        beaconMinor: UInt16? = nil,
        beaconProximity: String? = nil,
        attestationToken: String? = nil
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.horizontalAccuracy = horizontalAccuracy
        self.beaconUUID = beaconUUID
        self.beaconMajor = beaconMajor
        self.beaconMinor = beaconMinor
        self.beaconProximity = beaconProximity
        self.attestationToken = attestationToken
    }
}

public enum CheckInStatus: String, Codable, Hashable, Sendable {
    case pending
    case verified
    case rejected
    case expired
}
