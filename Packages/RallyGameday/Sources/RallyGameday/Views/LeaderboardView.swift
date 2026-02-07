import SwiftUI
import RallyCore
import RallyUI

// MARK: - LeaderboardView

/// Real-time leaderboard for a gameday event.
///
/// Displays ranked fan entries with score, tier badge, and avatar.
/// Highlights the current user's position and supports pull-to-refresh.
public struct LeaderboardView: View {
    let eventID: String
    let leaderboard: Leaderboard?
    let onRefresh: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isRefreshing: Bool = false
    @State private var animateEntries: Bool = false

    public init(
        eventID: String,
        leaderboard: Leaderboard?,
        onRefresh: @escaping () async -> Void
    ) {
        self.eventID = eventID
        self.leaderboard = leaderboard
        self.onRefresh = onRefresh
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: SpacingToken.md) {
                // MARK: Podium
                if let entries = leaderboard?.entries, entries.count >= 3 {
                    podiumSection(Array(entries.prefix(3)))
                }

                // MARK: Stats Banner
                if let lb = leaderboard {
                    statsBanner(lb)
                }

                // MARK: Full Rankings
                if let entries = leaderboard?.entries {
                    rankingsSection(entries)
                } else {
                    emptyState
                }
            }
            .padding(.horizontal, SpacingToken.md)
            .padding(.bottom, SpacingToken.xxxl)
        }
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle("Leaderboard")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Done") { dismiss() }
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
        .refreshable {
            await onRefresh()
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5).delay(0.1)) {
                animateEntries = true
            }
        }
    }

    // MARK: - Podium

    private func podiumSection(_ topThree: [LeaderboardEntry]) -> some View {
        HStack(alignment: .bottom, spacing: SpacingToken.smMd) {
            // 2nd place
            if topThree.count > 1 {
                podiumColumn(entry: topThree[1], height: 100, medal: "2")
            }

            // 1st place
            podiumColumn(entry: topThree[0], height: 130, medal: "1")

            // 3rd place
            if topThree.count > 2 {
                podiumColumn(entry: topThree[2], height: 80, medal: "3")
            }
        }
        .padding(.top, SpacingToken.lg)
        .padding(.bottom, SpacingToken.md)
    }

    private func podiumColumn(entry: LeaderboardEntry, height: CGFloat, medal: String) -> some View {
        VStack(spacing: SpacingToken.sm) {
            // Avatar
            ZStack {
                Circle()
                    .fill(podiumColor(medal).opacity(0.2))
                    .frame(width: 56, height: 56)

                if let avatarURL = entry.avatarURL {
                    AsyncImage(url: avatarURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.fill")
                            .foregroundStyle(podiumColor(medal))
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(Circle())
                } else {
                    Image(systemName: "person.fill")
                        .font(.title3)
                        .foregroundStyle(podiumColor(medal))
                }

                // Medal badge
                Text(medal)
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                    .frame(width: 20, height: 20)
                    .background(Circle().fill(podiumColor(medal)))
                    .offset(x: 20, y: -20)
            }

            // Name
            Text(entry.displayName)
                .font(TypographyToken.caption)
                .foregroundStyle(.white)
                .lineLimit(1)

            // Score
            Text(entry.score.pointsFormatted)
                .font(TypographyToken.buttonLabel)
                .foregroundStyle(podiumColor(medal))

            // Podium bar
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .fill(podiumColor(medal).opacity(0.3))
                .frame(height: height)
                .overlay(alignment: .top) {
                    RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                        .fill(podiumColor(medal))
                        .frame(height: 4)
                }
        }
        .frame(maxWidth: .infinity)
    }

    private func podiumColor(_ medal: String) -> Color {
        switch medal {
        case "1": return Color(red: 0.85, green: 0.65, blue: 0.13) // Gold
        case "2": return Color(red: 0.75, green: 0.75, blue: 0.78) // Silver
        case "3": return Color(red: 0.72, green: 0.45, blue: 0.20) // Bronze
        default:  return ColorToken.mediumGray
        }
    }

    // MARK: - Stats Banner

    private func statsBanner(_ lb: Leaderboard) -> some View {
        HStack(spacing: SpacingToken.lg) {
            if let rank = lb.currentUserRank {
                VStack(spacing: SpacingToken.xs) {
                    Text("YOUR RANK")
                        .font(TypographyToken.caption)
                        .foregroundStyle(ColorToken.mediumGray)
                    Text("#\(rank)")
                        .font(TypographyToken.sectionHeader)
                        .foregroundStyle(ColorToken.orange)
                }
            }

            Divider()
                .frame(height: 36)
                .overlay(ColorToken.navyMid)

            VStack(spacing: SpacingToken.xs) {
                Text("FANS")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                Text("\(lb.totalParticipants)")
                    .font(TypographyToken.sectionHeader)
                    .foregroundStyle(.white)
            }

            Divider()
                .frame(height: 36)
                .overlay(ColorToken.navyMid)

            VStack(spacing: SpacingToken.xs) {
                Text("UPDATED")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                Text(lb.updatedAt.formatted(.relative(presentation: .numeric)))
                    .font(TypographyToken.caption)
                    .foregroundStyle(.white)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    // MARK: - Full Rankings

    private func rankingsSection(_ entries: [LeaderboardEntry]) -> some View {
        VStack(alignment: .leading, spacing: SpacingToken.sm) {
            Text("All Rankings")
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)
                .padding(.top, SpacingToken.sm)

            LazyVStack(spacing: SpacingToken.xs) {
                ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                    leaderboardRow(entry, index: index)
                        .opacity(animateEntries ? 1 : 0)
                        .offset(y: animateEntries ? 0 : 20)
                        .animation(
                            .easeOut(duration: 0.3).delay(Double(index) * 0.03),
                            value: animateEntries
                        )
                }
            }
        }
    }

    private func leaderboardRow(_ entry: LeaderboardEntry, index: Int) -> some View {
        let isCurrentUser = entry.rank == leaderboard?.currentUserRank

        return HStack(spacing: SpacingToken.smMd) {
            // Rank
            Text("#\(entry.rank)")
                .font(TypographyToken.buttonLabel)
                .foregroundStyle(rankColor(entry.rank))
                .frame(width: 40, alignment: .leading)

            // Avatar
            ZStack {
                Circle()
                    .fill(entry.tier.color.opacity(0.2))
                    .frame(width: 36, height: 36)

                if let avatarURL = entry.avatarURL {
                    AsyncImage(url: avatarURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.fill")
                            .font(.caption)
                            .foregroundStyle(entry.tier.color)
                    }
                    .frame(width: 32, height: 32)
                    .clipShape(Circle())
                } else {
                    Image(systemName: "person.fill")
                        .font(.caption)
                        .foregroundStyle(entry.tier.color)
                }
            }

            // Name and tier
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.displayName)
                    .font(TypographyToken.body)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(entry.tier.rawValue)
                    .font(TypographyToken.caption)
                    .foregroundStyle(entry.tier.color)
            }

            Spacer()

            // Score
            Text(entry.score.pointsFormatted)
                .font(TypographyToken.buttonLabel)
                .foregroundStyle(ColorToken.mediumGray)
        }
        .padding(.vertical, SpacingToken.sm)
        .padding(.horizontal, SpacingToken.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .fill(isCurrentUser ? ColorToken.orange.opacity(0.1) : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                        .stroke(isCurrentUser ? ColorToken.orange.opacity(0.3) : Color.clear, lineWidth: 1)
                )
        )
    }

    private func rankColor(_ rank: Int) -> Color {
        switch rank {
        case 1: return Color(red: 0.85, green: 0.65, blue: 0.13)
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.78)
        case 3: return Color(red: 0.72, green: 0.45, blue: 0.20)
        default: return ColorToken.mediumGray
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "trophy")
                .font(.system(size: 48))
                .foregroundStyle(ColorToken.mediumGray)

            Text("Leaderboard Coming Soon")
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)

            Text("Check in and complete activations to earn points and climb the ranks!")
                .font(TypographyToken.body)
                .foregroundStyle(ColorToken.mediumGray)
                .multilineTextAlignment(.center)
        }
        .padding(SpacingToken.xxl)
    }
}

// MARK: - Preview

#Preview("Leaderboard") {
    NavigationStack {
        LeaderboardView(
            eventID: "evt-1",
            leaderboard: Leaderboard(
                eventID: "evt-1",
                entries: [
                    LeaderboardEntry(id: "1", userID: "u1", displayName: "Fanatic42", score: 1250, rank: 1, tier: .mvp),
                    LeaderboardEntry(id: "2", userID: "u2", displayName: "GamedayGuru", score: 1100, rank: 2, tier: .allStar),
                    LeaderboardEntry(id: "3", userID: "u3", displayName: "SectionK_Rep", score: 980, rank: 3, tier: .allStar),
                    LeaderboardEntry(id: "4", userID: "u4", displayName: "TailgateTom", score: 850, rank: 4, tier: .starter),
                    LeaderboardEntry(id: "5", userID: "u5", displayName: "MaroonMadness", score: 720, rank: 5, tier: .starter),
                    LeaderboardEntry(id: "6", userID: "u6", displayName: "BleacherBob", score: 650, rank: 6, tier: .starter),
                    LeaderboardEntry(id: "7", userID: "u7", displayName: "StadiumStar", score: 520, rank: 7, tier: .rookie),
                    LeaderboardEntry(id: "8", userID: "u8", displayName: "FreshmanFan", score: 310, rank: 8, tier: .rookie)
                ],
                currentUserRank: 5,
                totalParticipants: 482
            ),
            onRefresh: {}
        )
    }
    .environment(ThemeEngine())
}

#Preview("Leaderboard - Empty") {
    NavigationStack {
        LeaderboardView(
            eventID: "evt-1",
            leaderboard: nil,
            onRefresh: {}
        )
    }
    .environment(ThemeEngine())
}
