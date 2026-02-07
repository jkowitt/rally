import Foundation

/// Represents a sponsor with branded activations and content.
public struct Sponsor: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let logoURL: URL?
    public let websiteURL: URL?
    public let tier: SponsorTier

    public init(
        id: String,
        name: String,
        logoURL: URL? = nil,
        websiteURL: URL? = nil,
        tier: SponsorTier = .standard
    ) {
        self.id = id
        self.name = name
        self.logoURL = logoURL
        self.websiteURL = websiteURL
        self.tier = tier
    }
}

public enum SponsorTier: String, Codable, Hashable, Sendable {
    case presenting
    case premium
    case standard
}

/// Tracks a sponsor impression for analytics.
public struct SponsorImpression: Codable, Sendable {
    public let sponsorID: String
    public let placement: String
    public let activationID: String?
    public let eventID: String?
    public let timestamp: Date
    public let durationSeconds: TimeInterval?

    public init(
        sponsorID: String,
        placement: String,
        activationID: String? = nil,
        eventID: String? = nil,
        timestamp: Date = .now,
        durationSeconds: TimeInterval? = nil
    ) {
        self.sponsorID = sponsorID
        self.placement = placement
        self.activationID = activationID
        self.eventID = eventID
        self.timestamp = timestamp
        self.durationSeconds = durationSeconds
    }
}
