import SwiftUI
import RallyCore

/// Real-time leaderboard for gameday events.
public struct GamedayLeaderboardView: View {
    let leaderboard: Leaderboard
    let currentUserID: String

    public init(leaderboard: Leaderboard, currentUserID: String) {
        self.leaderboard = leaderboard
        self.currentUserID = currentUserID
    }

    public var body: some View {
        VStack(spacing: RallySpacing.md) {
            HStack {
                Text("Leaderboard")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)
                Spacer()
                Text("\(leaderboard.totalParticipants) fans")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            if leaderboard.entries.count >= 3 {
                podiumView
            }

            LazyVStack(spacing: RallySpacing.xs) {
                ForEach(leaderboard.entries) { entry in
                    leaderboardRow(entry)
                }
            }

            if let rank = leaderboard.currentUserRank,
               !leaderboard.entries.contains(where: { $0.userID == currentUserID }) {
                Divider().overlay(RallyColors.gray.opacity(0.3))
                HStack {
                    Text("#\(rank)")
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(RallyColors.orange)
                    Text("Your rank")
                        .font(RallyTypography.body)
                        .foregroundStyle(RallyColors.gray)
                    Spacer()
                }
                .padding(.horizontal, RallySpacing.md)
            }
        }
        .padding(RallySpacing.md)
    }

    private var podiumView: some View {
        HStack(alignment: .bottom, spacing: RallySpacing.md) {
            if leaderboard.entries.count > 1 {
                podiumEntry(leaderboard.entries[1], height: 60, medal: "2")
            }
            podiumEntry(leaderboard.entries[0], height: 80, medal: "1")
            if leaderboard.entries.count > 2 {
                podiumEntry(leaderboard.entries[2], height: 44, medal: "3")
            }
        }
        .padding(.vertical, RallySpacing.md)
    }

    private func podiumEntry(_ entry: LeaderboardEntry, height: CGFloat, medal: String) -> some View {
        VStack(spacing: RallySpacing.xs) {
            Circle()
                .fill(RallyColors.navyMid)
                .frame(width: 40, height: 40)
                .overlay {
                    Text(entry.displayName.prefix(1))
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(.white)
                }
            Text(entry.displayName)
                .font(RallyTypography.caption)
                .foregroundStyle(.white)
                .lineLimit(1)
            Text("\(entry.score) pts")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.orange)
            RoundedRectangle(cornerRadius: 4)
                .fill(medal == "1" ? RallyColors.orange : RallyColors.navyMid)
                .frame(width: 60, height: height)
                .overlay {
                    Text(medal)
                        .font(RallyTypography.sectionHeader)
                        .foregroundStyle(.white)
                }
        }
        .frame(maxWidth: .infinity)
    }

    private func leaderboardRow(_ entry: LeaderboardEntry) -> some View {
        let isCurrentUser = entry.userID == currentUserID

        return HStack(spacing: RallySpacing.sm) {
            Text("#\(entry.rank)")
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(entry.rank <= 3 ? RallyColors.orange : RallyColors.gray)
                .frame(width: 36)

            Circle()
                .fill(isCurrentUser ? RallyColors.orange.opacity(0.2) : RallyColors.navyMid)
                .frame(width: 32, height: 32)
                .overlay {
                    Text(entry.displayName.prefix(1))
                        .font(RallyTypography.caption)
                        .foregroundStyle(.white)
                }

            Text(entry.displayName)
                .font(isCurrentUser ? RallyTypography.cardTitle : RallyTypography.body)
                .foregroundStyle(isCurrentUser ? RallyColors.orange : .white)

            Spacer()

            Text("\(entry.score)")
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(.white)
                .monospacedDigit()
        }
        .padding(.vertical, RallySpacing.xs)
        .padding(.horizontal, RallySpacing.md)
        .background(
            isCurrentUser ? RallyColors.orange.opacity(0.1) : Color.clear,
            in: RoundedRectangle(cornerRadius: RallyRadius.small)
        )
        .accessibilityLabel("\(entry.displayName), rank \(entry.rank), \(entry.score) points")
    }
}
