import SwiftUI
import RallyCore
import RallyUI

/// Year-round engagement feed displaying articles, polls, countdowns,
/// and challenges in a scrollable, paginated list.
public struct ContentFeedView: View {
    @Bindable private var viewModel: ContentFeedViewModel
    @State private var selectedItem: ContentItem?

    public init(viewModel: ContentFeedViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            contentBody
                .navigationTitle("Feed")
                .toolbarTitleDisplayMode(.large)
                .refreshable {
                    await viewModel.refresh()
                }
                .task {
                    await viewModel.loadIfStale()
                }
        }
    }

    // MARK: - Content Body

    @ViewBuilder
    private var contentBody: some View {
        if viewModel.isLoading && viewModel.items.isEmpty {
            loadingView
        } else if let errorMessage = viewModel.errorMessage, viewModel.items.isEmpty {
            errorView(message: errorMessage)
        } else if viewModel.items.isEmpty {
            emptyView
        } else {
            feedList
        }
    }

    // MARK: - Feed List

    private var feedList: some View {
        ScrollView {
            LazyVStack(spacing: SpacingToken.md) {
                ForEach(viewModel.items) { item in
                    feedCard(for: item)
                        .onTapGesture {
                            selectedItem = item
                        }
                        .task {
                            await viewModel.loadMoreIfNeeded(currentItem: item)
                        }
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .padding(SpacingToken.lg)
                }
            }
            .padding(.horizontal, SpacingToken.md)
            .padding(.top, SpacingToken.sm)
        }
        .background(ColorToken.offWhite)
        .sheet(item: $selectedItem) { item in
            ContentDetailView(item: item)
        }
    }

    // MARK: - Feed Card

    @ViewBuilder
    private func feedCard(for item: ContentItem) -> some View {
        VStack(alignment: .leading, spacing: SpacingToken.sm) {
            // Type badge and timestamp row
            HStack {
                typeBadge(for: item.type)
                Spacer()
                Text(item.publishedAt.relativeDescription)
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
            }

            // Hero image
            if let imageURL = item.imageURL {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(16 / 9, contentMode: .fill)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small))
                    case .failure:
                        imagePlaceholder
                    case .empty:
                        imagePlaceholder
                            .overlay(ProgressView())
                    @unknown default:
                        imagePlaceholder
                    }
                }
                .frame(height: 180)
            }

            // Title
            Text(item.title)
                .font(TypographyToken.cardTitle)
                .foregroundStyle(ColorToken.navy)
                .lineLimit(2)

            // Body preview
            if let body = item.body {
                Text(body)
                    .font(TypographyToken.subtitle)
                    .foregroundStyle(ColorToken.mediumGray)
                    .lineLimit(3)
            }

            // Engagement bar
            if let engagement = item.engagementData {
                engagementBar(engagement)
            }
        }
        .padding(SpacingToken.md)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card))
        .shadow(
            color: ShadowToken.cardColor,
            radius: ShadowToken.cardRadius,
            x: ShadowToken.cardX,
            y: ShadowToken.cardY
        )
    }

    // MARK: - Type Badge

    private func typeBadge(for type: ContentType) -> some View {
        Text(type.displayLabel)
            .font(TypographyToken.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.sm)
            .padding(.vertical, SpacingToken.xs)
            .background(type.badgeColor)
            .clipShape(Capsule())
    }

    // MARK: - Engagement Bar

    private func engagementBar(_ engagement: ContentEngagement) -> some View {
        HStack(spacing: SpacingToken.md) {
            Label("\(engagement.likes.abbreviated)", systemImage: "heart.fill")
            Label("\(engagement.comments.abbreviated)", systemImage: "bubble.right.fill")
            Label("\(engagement.shares.abbreviated)", systemImage: "arrow.turn.up.right")
            Spacer()
            if let points = engagement.pointsValue, points > 0 {
                Text("+\(points) pts")
                    .font(TypographyToken.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(ColorToken.orange)
            }
        }
        .font(TypographyToken.caption)
        .foregroundStyle(ColorToken.mediumGray)
    }

    // MARK: - Placeholder / States

    private var imagePlaceholder: some View {
        RoundedRectangle(cornerRadius: RadiusToken.small)
            .fill(ColorToken.offWhite)
            .frame(height: 180)
    }

    private var loadingView: some View {
        VStack(spacing: SpacingToken.md) {
            ProgressView()
                .controlSize(.large)
            Text("Loading feed...")
                .font(TypographyToken.body)
                .foregroundStyle(ColorToken.mediumGray)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundStyle(ColorToken.error)
            Text(message)
                .font(TypographyToken.body)
                .foregroundStyle(ColorToken.mediumGray)
                .multilineTextAlignment(.center)
            Button("Try Again") {
                Task { await viewModel.loadFeed() }
            }
            .font(TypographyToken.buttonLabel)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.lg)
            .padding(.vertical, SpacingToken.smMd)
            .background(ColorToken.orange)
            .clipShape(RoundedRectangle(cornerRadius: RadiusToken.button))
        }
        .padding(SpacingToken.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "newspaper")
                .font(.system(size: 40))
                .foregroundStyle(ColorToken.mediumGray)
            Text("No content yet")
                .font(TypographyToken.cardTitle)
                .foregroundStyle(ColorToken.navy)
            Text("Check back soon for articles, polls, and more.")
                .font(TypographyToken.subtitle)
                .foregroundStyle(ColorToken.mediumGray)
                .multilineTextAlignment(.center)
        }
        .padding(SpacingToken.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - ContentType Helpers

private extension ContentType {
    var displayLabel: String {
        switch self {
        case .article:      return "Article"
        case .poll:         return "Poll"
        case .countdown:    return "Countdown"
        case .challenge:    return "Challenge"
        case .highlight:    return "Highlight"
        case .announcement: return "News"
        }
    }

    var badgeColor: Color {
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

#Preview("Content Feed") {
    ContentFeedView(
        viewModel: ContentFeedViewModel(
            contentRepository: PreviewContentRepository(),
            schoolID: "school-001"
        )
    )
}

// MARK: - Preview Repository

private struct PreviewContentRepository: ContentRepositoryProtocol {
    func fetchFeed(schoolID: String, page: Int, pageSize: Int) async throws -> PaginatedResponse<ContentItem> {
        let items = [
            ContentItem(
                id: "1",
                schoolID: schoolID,
                type: .article,
                title: "Season Opener: What to Expect This Year",
                body: "A deep-dive into the upcoming season with interviews from coaches and players about their expectations.",
                imageURL: URL(string: "https://placehold.co/600x340"),
                author: "Rally Staff",
                publishedAt: Date.now.addingTimeInterval(-3_600),
                tags: ["football", "preview"],
                engagementData: ContentEngagement(likes: 142, comments: 23, shares: 8, pointsValue: 10)
            ),
            ContentItem(
                id: "2",
                schoolID: schoolID,
                type: .poll,
                title: "Who will be MVP this season?",
                publishedAt: Date.now.addingTimeInterval(-7_200),
                tags: ["poll", "fan-vote"],
                engagementData: ContentEngagement(likes: 87, comments: 45, shares: 3, pointsValue: 5)
            ),
            ContentItem(
                id: "3",
                schoolID: schoolID,
                type: .countdown,
                title: "Countdown to Homecoming",
                body: "Only days left until the biggest game of the year!",
                publishedAt: Date.now.addingTimeInterval(-600),
                tags: ["homecoming"]
            ),
            ContentItem(
                id: "4",
                schoolID: schoolID,
                type: .challenge,
                title: "Photo Challenge: Best Tailgate Setup",
                body: "Share your tailgate setup for a chance to earn bonus points.",
                publishedAt: Date.now.addingTimeInterval(-14_400),
                tags: ["challenge", "tailgate"],
                engagementData: ContentEngagement(likes: 56, comments: 12, shares: 19, pointsValue: 25)
            )
        ]
        return PaginatedResponse(items: items, page: 1, pageSize: pageSize, totalItems: 4, totalPages: 1)
    }

    func fetchContentItem(id: String) async throws -> ContentItem {
        ContentItem(id: id, schoolID: "school-001", type: .article, title: "Preview Article")
    }
}
