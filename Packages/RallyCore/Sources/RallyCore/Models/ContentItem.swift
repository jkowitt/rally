import Foundation

/// Represents a content item in the year-round engagement feed.
public struct ContentItem: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let schoolID: String
    public let type: ContentType
    public let title: String
    public let body: String?
    public let imageURL: URL?
    public let externalURL: URL?
    public let author: String?
    public let publishedAt: Date
    public let tags: [String]
    public let sponsorID: String?
    public let engagementData: ContentEngagement?

    public init(
        id: String,
        schoolID: String,
        type: ContentType,
        title: String,
        body: String? = nil,
        imageURL: URL? = nil,
        externalURL: URL? = nil,
        author: String? = nil,
        publishedAt: Date = .now,
        tags: [String] = [],
        sponsorID: String? = nil,
        engagementData: ContentEngagement? = nil
    ) {
        self.id = id
        self.schoolID = schoolID
        self.type = type
        self.title = title
        self.body = body
        self.imageURL = imageURL
        self.externalURL = externalURL
        self.author = author
        self.publishedAt = publishedAt
        self.tags = tags
        self.sponsorID = sponsorID
        self.engagementData = engagementData
    }
}

public enum ContentType: String, Codable, Hashable, Sendable {
    case article
    case poll
    case countdown
    case challenge
    case highlight
    case announcement
}

public struct ContentEngagement: Codable, Hashable, Sendable {
    public let likes: Int
    public let comments: Int
    public let shares: Int
    public let pointsValue: Int?

    public init(likes: Int = 0, comments: Int = 0, shares: Int = 0, pointsValue: Int? = nil) {
        self.likes = likes
        self.comments = comments
        self.shares = shares
        self.pointsValue = pointsValue
    }
}
