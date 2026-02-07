import Foundation

/// Represents a sporting event that fans can attend and earn points at.
public struct Event: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let schoolID: String
    public let sport: Sport
    public let title: String
    public let opponent: String
    public let venueID: String
    public let startTime: Date
    public let endTime: Date?
    public let status: EventStatus
    public let imageURL: URL?
    public let activations: [Activation]
    public let homeScore: Int?
    public let awayScore: Int?

    public init(
        id: String,
        schoolID: String,
        sport: Sport,
        title: String,
        opponent: String,
        venueID: String,
        startTime: Date,
        endTime: Date? = nil,
        status: EventStatus = .upcoming,
        imageURL: URL? = nil,
        activations: [Activation] = [],
        homeScore: Int? = nil,
        awayScore: Int? = nil
    ) {
        self.id = id
        self.schoolID = schoolID
        self.sport = sport
        self.title = title
        self.opponent = opponent
        self.venueID = venueID
        self.startTime = startTime
        self.endTime = endTime
        self.status = status
        self.imageURL = imageURL
        self.activations = activations
        self.homeScore = homeScore
        self.awayScore = awayScore
    }
}

public enum EventStatus: String, Codable, Hashable, Sendable {
    case upcoming
    case live
    case completed
    case cancelled
}

/// Represents a gameday activation (e.g., prediction, trivia, noise meter).
public struct Activation: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let eventID: String
    public let type: ActivationType
    public let title: String
    public let description: String
    public let pointsValue: Int
    public let startsAt: Date?
    public let endsAt: Date?
    public let status: ActivationStatus
    public let sponsorID: String?
    public let payload: ActivationPayload?

    public init(
        id: String,
        eventID: String,
        type: ActivationType,
        title: String,
        description: String = "",
        pointsValue: Int,
        startsAt: Date? = nil,
        endsAt: Date? = nil,
        status: ActivationStatus = .upcoming,
        sponsorID: String? = nil,
        payload: ActivationPayload? = nil
    ) {
        self.id = id
        self.eventID = eventID
        self.type = type
        self.title = title
        self.description = description
        self.pointsValue = pointsValue
        self.startsAt = startsAt
        self.endsAt = endsAt
        self.status = status
        self.sponsorID = sponsorID
        self.payload = payload
    }
}

public enum ActivationType: String, Codable, Hashable, Sendable {
    case prediction
    case trivia
    case noiseMeter = "noise_meter"
    case poll
    case photoChallenge = "photo_challenge"
    case checkIn = "check_in"
    case survey
}

public enum ActivationStatus: String, Codable, Hashable, Sendable {
    case upcoming
    case active
    case locked
    case completed
}

/// Flexible payload for activation-specific data.
public struct ActivationPayload: Codable, Hashable, Sendable {
    public let question: String?
    public let options: [ActivationOption]?
    public let correctOptionID: String?
    public let imageURL: URL?
    public let timeLimit: TimeInterval?

    public init(
        question: String? = nil,
        options: [ActivationOption]? = nil,
        correctOptionID: String? = nil,
        imageURL: URL? = nil,
        timeLimit: TimeInterval? = nil
    ) {
        self.question = question
        self.options = options
        self.correctOptionID = correctOptionID
        self.imageURL = imageURL
        self.timeLimit = timeLimit
    }
}

public struct ActivationOption: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let text: String
    public let imageURL: URL?

    public init(id: String, text: String, imageURL: URL? = nil) {
        self.id = id
        self.text = text
        self.imageURL = imageURL
    }
}
