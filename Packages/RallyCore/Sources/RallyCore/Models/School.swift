import Foundation

/// Represents a partner school in the Rally platform.
public struct School: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let mascot: String
    public let abbreviation: String
    public let logoURL: URL?
    public let mascotImageURL: URL?
    public let bannerImageURL: URL?
    public let theme: SchoolTheme
    public let venues: [Venue]
    public let isActive: Bool

    public init(
        id: String,
        name: String,
        mascot: String,
        abbreviation: String,
        logoURL: URL? = nil,
        mascotImageURL: URL? = nil,
        bannerImageURL: URL? = nil,
        theme: SchoolTheme,
        venues: [Venue] = [],
        isActive: Bool = true
    ) {
        self.id = id
        self.name = name
        self.mascot = mascot
        self.abbreviation = abbreviation
        self.logoURL = logoURL
        self.mascotImageURL = mascotImageURL
        self.bannerImageURL = bannerImageURL
        self.theme = theme
        self.venues = venues
        self.isActive = isActive
    }
}

public struct SchoolTheme: Codable, Hashable, Sendable {
    public let primaryColor: String
    public let secondaryColor: String
    public let accentColor: String
    public let darkModeBackground: String?
    public let fontOverride: String?

    public init(
        primaryColor: String,
        secondaryColor: String,
        accentColor: String,
        darkModeBackground: String? = nil,
        fontOverride: String? = nil
    ) {
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.accentColor = accentColor
        self.darkModeBackground = darkModeBackground
        self.fontOverride = fontOverride
    }
}

public struct Venue: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let latitude: Double
    public let longitude: Double
    public let radiusMeters: Double
    public let beaconUUID: String?
    public let beaconMajor: UInt16?
    public let sport: Sport

    public init(
        id: String,
        name: String,
        latitude: Double,
        longitude: Double,
        radiusMeters: Double = 500,
        beaconUUID: String? = nil,
        beaconMajor: UInt16? = nil,
        sport: Sport = .football
    ) {
        self.id = id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.radiusMeters = radiusMeters
        self.beaconUUID = beaconUUID
        self.beaconMajor = beaconMajor
        self.sport = sport
    }
}

public enum Sport: String, Codable, Hashable, Sendable, CaseIterable {
    case football
    case basketball
    case baseball
    case softball
    case soccer
    case volleyball
    case hockey
    case lacrosse
    case other
}
