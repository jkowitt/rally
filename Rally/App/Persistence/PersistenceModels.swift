import Foundation
import SwiftData
import RallyCore

/// SwiftData model for offline school caching.
@Model
final class CachedSchool {
    @Attribute(.unique) var schoolID: String
    var name: String
    var mascot: String
    var abbreviation: String
    var logoURLString: String?
    var primaryColor: String
    var secondaryColor: String
    var accentColor: String
    var venuesData: Data?
    var lastUpdated: Date
    var isActive: Bool

    init(from school: School) {
        self.schoolID = school.id
        self.name = school.name
        self.mascot = school.mascot
        self.abbreviation = school.abbreviation
        self.logoURLString = school.logoURL?.absoluteString
        self.primaryColor = school.theme.primaryColor
        self.secondaryColor = school.theme.secondaryColor
        self.accentColor = school.theme.accentColor
        self.venuesData = try? JSONEncoder().encode(school.venues)
        self.lastUpdated = .now
        self.isActive = school.isActive
    }

    func toSchool() -> School {
        let venues: [Venue] = (try? venuesData.flatMap {
            try JSONDecoder().decode([Venue].self, from: $0)
        }) ?? []

        return School(
            id: schoolID,
            name: name,
            mascot: mascot,
            abbreviation: abbreviation,
            logoURL: logoURLString.flatMap(URL.init),
            theme: SchoolTheme(
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                accentColor: accentColor
            ),
            venues: venues,
            isActive: isActive
        )
    }
}

/// SwiftData model for offline event caching.
@Model
final class CachedEvent {
    @Attribute(.unique) var eventID: String
    var schoolID: String
    var sportRawValue: String
    var title: String
    var opponent: String
    var venueID: String
    var startTime: Date
    var endTime: Date?
    var statusRawValue: String
    var imageURLString: String?
    var activationsData: Data?
    var homeScore: Int?
    var awayScore: Int?
    var lastUpdated: Date

    init(from event: Event) {
        self.eventID = event.id
        self.schoolID = event.schoolID
        self.sportRawValue = event.sport.rawValue
        self.title = event.title
        self.opponent = event.opponent
        self.venueID = event.venueID
        self.startTime = event.startTime
        self.endTime = event.endTime
        self.statusRawValue = event.status.rawValue
        self.imageURLString = event.imageURL?.absoluteString
        self.activationsData = try? JSONEncoder().encode(event.activations)
        self.homeScore = event.homeScore
        self.awayScore = event.awayScore
        self.lastUpdated = .now
    }

    func toEvent() -> Event {
        let activations: [Activation] = (try? activationsData.flatMap {
            try JSONDecoder().decode([Activation].self, from: $0)
        }) ?? []

        return Event(
            id: eventID,
            schoolID: schoolID,
            sport: Sport(rawValue: sportRawValue) ?? .other,
            title: title,
            opponent: opponent,
            venueID: venueID,
            startTime: startTime,
            endTime: endTime,
            status: EventStatus(rawValue: statusRawValue) ?? .upcoming,
            imageURL: imageURLString.flatMap(URL.init),
            activations: activations,
            homeScore: homeScore,
            awayScore: awayScore
        )
    }
}

/// SwiftData model for queuing offline check-ins.
@Model
final class PendingCheckIn {
    @Attribute(.unique) var checkInID: String
    var eventID: String
    var venueID: String
    var latitude: Double
    var longitude: Double
    var horizontalAccuracy: Double
    var beaconUUID: String?
    var beaconMajor: Int?
    var beaconMinor: Int?
    var beaconProximity: String?
    var attestationToken: String?
    var timestamp: Date
    var retryCount: Int
    var lastRetryAt: Date?

    init(eventID: String, venueID: String, proof: CheckInProof) {
        self.checkInID = UUID().uuidString
        self.eventID = eventID
        self.venueID = venueID
        self.latitude = proof.latitude
        self.longitude = proof.longitude
        self.horizontalAccuracy = proof.horizontalAccuracy
        self.beaconUUID = proof.beaconUUID
        self.beaconMajor = proof.beaconMajor.map(Int.init)
        self.beaconMinor = proof.beaconMinor.map(Int.init)
        self.beaconProximity = proof.beaconProximity
        self.attestationToken = proof.attestationToken
        self.timestamp = .now
        self.retryCount = 0
    }

    func toProof() -> CheckInProof {
        CheckInProof(
            latitude: latitude,
            longitude: longitude,
            horizontalAccuracy: horizontalAccuracy,
            beaconUUID: beaconUUID,
            beaconMajor: beaconMajor.map(UInt16.init),
            beaconMinor: beaconMinor.map(UInt16.init),
            beaconProximity: beaconProximity,
            attestationToken: attestationToken
        )
    }
}

/// SwiftData model for queuing offline activation submissions.
@Model
final class PendingSubmission {
    @Attribute(.unique) var submissionID: String
    var activationID: String
    var payloadData: Data
    var timestamp: Date
    var retryCount: Int
    var lastRetryAt: Date?

    init(activationID: String, payload: Data) {
        self.submissionID = UUID().uuidString
        self.activationID = activationID
        self.payloadData = payload
        self.timestamp = .now
        self.retryCount = 0
    }
}

/// SwiftData model for local points ledger.
@Model
final class LocalPointsTransaction {
    @Attribute(.unique) var transactionID: String
    var amount: Int
    var typeRawValue: String
    var sourceRawValue: String
    var transactionDescription: String
    var eventID: String?
    var activationID: String?
    var createdAt: Date
    var isReconciled: Bool

    init(from transaction: PointsTransaction) {
        self.transactionID = transaction.id
        self.amount = transaction.amount
        self.typeRawValue = transaction.type.rawValue
        self.sourceRawValue = transaction.source.rawValue
        self.transactionDescription = transaction.description
        self.eventID = transaction.eventID
        self.activationID = transaction.activationID
        self.createdAt = transaction.createdAt
        self.isReconciled = transaction.isReconciled
    }

    func toTransaction(userID: String) -> PointsTransaction {
        PointsTransaction(
            id: transactionID,
            userID: userID,
            amount: amount,
            type: TransactionType(rawValue: typeRawValue) ?? .earned,
            source: TransactionSource(rawValue: sourceRawValue) ?? .admin,
            description: transactionDescription,
            eventID: eventID,
            activationID: activationID,
            createdAt: createdAt,
            isReconciled: isReconciled
        )
    }
}

/// SwiftData model for cached rewards.
@Model
final class CachedReward {
    @Attribute(.unique) var rewardID: String
    var schoolID: String
    var title: String
    var rewardDescription: String
    var pointsCost: Int
    var imageURLString: String?
    var categoryRawValue: String
    var minimumTierRawValue: String
    var sponsorID: String?
    var inventory: Int?
    var expiresAt: Date?
    var isActive: Bool
    var lastUpdated: Date

    init(from reward: Reward) {
        self.rewardID = reward.id
        self.schoolID = reward.schoolID
        self.title = reward.title
        self.rewardDescription = reward.description
        self.pointsCost = reward.pointsCost
        self.imageURLString = reward.imageURL?.absoluteString
        self.categoryRawValue = reward.category.rawValue
        self.minimumTierRawValue = reward.minimumTier.rawValue
        self.sponsorID = reward.sponsorID
        self.inventory = reward.inventory
        self.expiresAt = reward.expiresAt
        self.isActive = reward.isActive
        self.lastUpdated = .now
    }

    func toReward() -> Reward {
        Reward(
            id: rewardID,
            schoolID: schoolID,
            title: title,
            description: rewardDescription,
            pointsCost: pointsCost,
            imageURL: imageURLString.flatMap(URL.init),
            category: RewardCategory(rawValue: categoryRawValue) ?? .merchandise,
            minimumTier: Tier(rawValue: minimumTierRawValue) ?? .rookie,
            sponsorID: sponsorID,
            inventory: inventory,
            expiresAt: expiresAt,
            isActive: isActive
        )
    }
}

/// SwiftData model for cached content feed items.
@Model
final class CachedContentItem {
    @Attribute(.unique) var contentID: String
    var schoolID: String
    var typeRawValue: String
    var title: String
    var body: String?
    var imageURLString: String?
    var externalURLString: String?
    var author: String?
    var publishedAt: Date
    var tags: [String]
    var sponsorID: String?
    var lastUpdated: Date

    init(from item: ContentItem) {
        self.contentID = item.id
        self.schoolID = item.schoolID
        self.typeRawValue = item.type.rawValue
        self.title = item.title
        self.body = item.body
        self.imageURLString = item.imageURL?.absoluteString
        self.externalURLString = item.externalURL?.absoluteString
        self.author = item.author
        self.publishedAt = item.publishedAt
        self.tags = item.tags
        self.sponsorID = item.sponsorID
        self.lastUpdated = .now
    }

    func toContentItem() -> ContentItem {
        ContentItem(
            id: contentID,
            schoolID: schoolID,
            type: ContentType(rawValue: typeRawValue) ?? .article,
            title: title,
            body: body,
            imageURL: imageURLString.flatMap(URL.init),
            externalURL: externalURLString.flatMap(URL.init),
            author: author,
            publishedAt: publishedAt,
            tags: tags,
            sponsorID: sponsorID
        )
    }
}
