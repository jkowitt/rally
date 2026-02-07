import SwiftUI
import RallyCore
import RallyUI

/// Full-screen detail view for an article or content item, featuring a hero
/// image, rich body text, author attribution, and engagement actions.
public struct ContentDetailView: View {
    private let item: ContentItem

    @State private var isLiked = false
    @State private var isBookmarked = false
    @State private var showShareSheet = false
    @Environment(\.dismiss) private var dismiss

    public init(item: ContentItem) {
        self.item = item
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heroImage
                    contentBody
                }
            }
            .background(Color.white)
            .ignoresSafeArea(edges: .top)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    closeButton
                }
                ToolbarItem(placement: .topBarTrailing) {
                    shareButton
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }

    // MARK: - Hero Image

    @ViewBuilder
    private var heroImage: some View {
        if let imageURL = item.imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(16 / 9, contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .frame(height: 260)
                        .clipped()
                case .failure:
                    heroPlaceholder
                case .empty:
                    heroPlaceholder
                        .overlay(ProgressView())
                @unknown default:
                    heroPlaceholder
                }
            }
        } else {
            heroPlaceholder
        }
    }

    private var heroPlaceholder: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [ColorToken.navy, ColorToken.navy.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(height: 260)
            .overlay(
                Image(systemName: item.type.systemImage)
                    .font(.system(size: 48))
                    .foregroundStyle(.white.opacity(0.3))
            )
    }

    // MARK: - Content Body

    private var contentBody: some View {
        VStack(alignment: .leading, spacing: SpacingToken.md) {
            // Type badge
            typeBadge

            // Title
            Text(item.title)
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(ColorToken.navy)

            // Author and date
            authorDateRow

            // Divider
            Divider()

            // Rich body text
            if let body = item.body {
                Text(body)
                    .font(TypographyToken.body)
                    .foregroundStyle(ColorToken.navy.opacity(0.85))
                    .lineSpacing(6)
            }

            // Tags
            if !item.tags.isEmpty {
                tagsSection
            }

            // Engagement actions
            Divider()
            engagementActions

            // Points callout
            if let points = item.engagementData?.pointsValue, points > 0 {
                pointsCallout(points: points)
            }
        }
        .padding(SpacingToken.md)
    }

    // MARK: - Type Badge

    private var typeBadge: some View {
        Text(item.type.rawValue.capitalized)
            .font(TypographyToken.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.sm)
            .padding(.vertical, SpacingToken.xs)
            .background(item.type.accentColor)
            .clipShape(Capsule())
    }

    // MARK: - Author / Date

    private var authorDateRow: some View {
        HStack(spacing: SpacingToken.sm) {
            if let author = item.author {
                Image(systemName: "person.circle.fill")
                    .foregroundStyle(ColorToken.mediumGray)
                Text(author)
                    .font(TypographyToken.subtitle)
                    .foregroundStyle(ColorToken.navy)

                Circle()
                    .fill(ColorToken.mediumGray)
                    .frame(width: 4, height: 4)
            }

            Text(item.publishedAt.relativeDescription)
                .font(TypographyToken.subtitle)
                .foregroundStyle(ColorToken.mediumGray)
        }
    }

    // MARK: - Tags

    private var tagsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SpacingToken.sm) {
                ForEach(item.tags, id: \.self) { tag in
                    Text("#\(tag)")
                        .font(TypographyToken.caption)
                        .foregroundStyle(ColorToken.accentBlue)
                        .padding(.horizontal, SpacingToken.sm)
                        .padding(.vertical, SpacingToken.xs)
                        .background(ColorToken.accentBlue.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Engagement Actions

    private var engagementActions: some View {
        HStack(spacing: SpacingToken.lg) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    isLiked.toggle()
                }
            } label: {
                Label(likeCountText, systemImage: isLiked ? "heart.fill" : "heart")
                    .foregroundStyle(isLiked ? ColorToken.error : ColorToken.mediumGray)
            }

            Button {
                // Comment action placeholder
            } label: {
                Label(commentCountText, systemImage: "bubble.right")
                    .foregroundStyle(ColorToken.mediumGray)
            }

            Button {
                showShareSheet = true
            } label: {
                Label("Share", systemImage: "arrow.turn.up.right")
                    .foregroundStyle(ColorToken.mediumGray)
            }

            Spacer()

            Button {
                withAnimation {
                    isBookmarked.toggle()
                }
            } label: {
                Image(systemName: isBookmarked ? "bookmark.fill" : "bookmark")
                    .foregroundStyle(isBookmarked ? ColorToken.orange : ColorToken.mediumGray)
            }
        }
        .font(TypographyToken.subtitle)
    }

    // MARK: - Points Callout

    private func pointsCallout(points: Int) -> some View {
        HStack(spacing: SpacingToken.sm) {
            Image(systemName: "star.circle.fill")
                .font(.title3)
                .foregroundStyle(ColorToken.orange)
            Text("Earn \(points.pointsFormatted) by engaging with this content")
                .font(TypographyToken.subtitle)
                .foregroundStyle(ColorToken.navy)
            Spacer()
        }
        .padding(SpacingToken.smMd)
        .background(ColorToken.orange.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small))
    }

    // MARK: - Toolbar Buttons

    private var closeButton: some View {
        Button {
            dismiss()
        } label: {
            Image(systemName: "xmark.circle.fill")
                .font(.title2)
                .symbolRenderingMode(.palette)
                .foregroundStyle(.white, .black.opacity(0.4))
        }
    }

    private var shareButton: some View {
        Button {
            showShareSheet = true
        } label: {
            Image(systemName: "square.and.arrow.up.circle.fill")
                .font(.title2)
                .symbolRenderingMode(.palette)
                .foregroundStyle(.white, .black.opacity(0.4))
        }
    }

    // MARK: - Computed Helpers

    private var likeCountText: String {
        let base = item.engagementData?.likes ?? 0
        let adjusted = isLiked ? base + 1 : base
        return "\(adjusted.abbreviated)"
    }

    private var commentCountText: String {
        let count = item.engagementData?.comments ?? 0
        return "\(count.abbreviated)"
    }
}

// MARK: - ContentType Detail Helpers

private extension ContentType {
    var systemImage: String {
        switch self {
        case .article:      return "doc.richtext"
        case .poll:         return "chart.bar.xaxis"
        case .countdown:    return "timer"
        case .challenge:    return "flag.checkered"
        case .highlight:    return "play.rectangle.fill"
        case .announcement: return "megaphone.fill"
        }
    }

    var accentColor: Color {
        switch self {
        case .article:      return ColorToken.accentBlue
        case .poll:         return ColorToken.orange
        case .countdown:    return ColorToken.navy
        case .challenge:    return ColorToken.success
        case .highlight:    return ColorToken.warning
        case .announcement: return ColorToken.mediumGray
        }
    }
}

// MARK: - Preview

#Preview("Content Detail - Article") {
    ContentDetailView(
        item: ContentItem(
            id: "preview-1",
            schoolID: "school-001",
            type: .article,
            title: "Season Opener: Everything You Need to Know",
            body: """
            The highly anticipated season opener is just around the corner, and the excitement \
            is building across campus. Head Coach has been putting the team through an intense \
            preseason program, and early reports suggest this could be a breakout year.

            Key storylines to watch include the quarterback battle between two talented arms, \
            the return of three All-Conference defenders, and a revamped special teams unit \
            that promises to be among the best in the league.

            Fan attendance is expected to shatter records this year, with the student section \
            already reporting a 30% increase in season pass sales. Make sure you arrive early \
            to take advantage of all the gameday activations and earn bonus Rally points.

            Don't forget to check in at the venue to earn your attendance points and unlock \
            exclusive rewards in the Rally marketplace.
            """,
            imageURL: URL(string: "https://placehold.co/600x340"),
            author: "Rally Staff",
            publishedAt: Date.now.addingTimeInterval(-3_600),
            tags: ["football", "season-preview", "gameday"],
            engagementData: ContentEngagement(likes: 234, comments: 45, shares: 18, pointsValue: 10)
        )
    )
}

#Preview("Content Detail - Challenge") {
    ContentDetailView(
        item: ContentItem(
            id: "preview-2",
            schoolID: "school-001",
            type: .challenge,
            title: "Tailgate Photo Challenge",
            body: "Show us your best tailgate setup before the big game! Share your photo for a chance to win bonus points.",
            publishedAt: Date.now.addingTimeInterval(-1_800),
            tags: ["challenge", "tailgate", "photo"],
            engagementData: ContentEngagement(likes: 56, comments: 12, shares: 8, pointsValue: 25)
        )
    )
}
