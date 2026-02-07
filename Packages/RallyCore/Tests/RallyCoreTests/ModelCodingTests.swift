import Testing
import Foundation
@testable import RallyCore

@Suite("Model Codable Tests")
struct ModelCodingTests {
    let encoder = JSONEncoder()
    let decoder = JSONDecoder()

    init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    @Test("School round-trips through JSON")
    func schoolCoding() throws {
        let school = School.sample
        let data = try encoder.encode(school)
        let decoded = try decoder.decode(School.self, from: data)
        #expect(decoded.id == school.id)
        #expect(decoded.name == school.name)
        #expect(decoded.mascot == school.mascot)
        #expect(decoded.theme.primaryColor == school.theme.primaryColor)
    }

    @Test("Event round-trips through JSON")
    func eventCoding() throws {
        let event = Event.sample
        let data = try encoder.encode(event)
        let decoded = try decoder.decode(Event.self, from: data)
        #expect(decoded.id == event.id)
        #expect(decoded.sport == event.sport)
        #expect(decoded.title == event.title)
    }

    @Test("Activation with payload round-trips")
    func activationCoding() throws {
        let activation = Activation.sample
        let data = try encoder.encode(activation)
        let decoded = try decoder.decode(Activation.self, from: data)
        #expect(decoded.id == activation.id)
        #expect(decoded.type == .prediction)
        #expect(decoded.payload?.options?.count == activation.payload?.options?.count)
    }

    @Test("Reward round-trips through JSON")
    func rewardCoding() throws {
        let reward = Reward.sample
        let data = try encoder.encode(reward)
        let decoded = try decoder.decode(Reward.self, from: data)
        #expect(decoded.id == reward.id)
        #expect(decoded.pointsCost == reward.pointsCost)
        #expect(decoded.minimumTier == reward.minimumTier)
    }

    @Test("UserProfile round-trips through JSON")
    func userProfileCoding() throws {
        let user = UserProfile.sample
        let data = try encoder.encode(user)
        let decoded = try decoder.decode(UserProfile.self, from: data)
        #expect(decoded.id == user.id)
        #expect(decoded.tier == user.tier)
        #expect(decoded.pointsBalance == user.pointsBalance)
    }

    @Test("CheckInProof round-trips through JSON")
    func checkInProofCoding() throws {
        let proof = CheckInProof(
            latitude: 39.65,
            longitude: -79.95,
            horizontalAccuracy: 5.0,
            beaconUUID: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
            beaconMajor: 1,
            beaconMinor: 42
        )
        let data = try encoder.encode(proof)
        let decoded = try decoder.decode(CheckInProof.self, from: data)
        #expect(decoded.latitude == proof.latitude)
        #expect(decoded.beaconUUID == proof.beaconUUID)
        #expect(decoded.beaconMajor == proof.beaconMajor)
    }

    @Test("PaginatedResponse round-trips")
    func paginatedResponseCoding() throws {
        let response = PaginatedResponse(
            items: [Reward.sample],
            page: 1,
            pageSize: 20,
            totalItems: 50,
            totalPages: 3
        )
        let data = try encoder.encode(response)
        let decoded = try decoder.decode(PaginatedResponse<Reward>.self, from: data)
        #expect(decoded.items.count == 1)
        #expect(decoded.totalPages == 3)
    }

    @Test("Sport enum raw values")
    func sportRawValues() {
        #expect(Sport.football.rawValue == "football")
        #expect(Sport.basketball.rawValue == "basketball")
        #expect(Sport.allCases.count == 9)
    }

    @Test("EventStatus enum raw values")
    func eventStatusRawValues() {
        #expect(EventStatus.live.rawValue == "live")
        #expect(EventStatus.upcoming.rawValue == "upcoming")
    }

    @Test("ActivationType enum raw values")
    func activationTypeRawValues() {
        #expect(ActivationType.noiseMeter.rawValue == "noise_meter")
        #expect(ActivationType.photoChallenge.rawValue == "photo_challenge")
        #expect(ActivationType.checkIn.rawValue == "check_in")
    }
}
