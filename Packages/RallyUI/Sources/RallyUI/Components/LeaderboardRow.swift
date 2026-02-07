import SwiftUI
import RallyCore

/// Leaderboard entry row showing rank, avatar, display name, and score.
/// Highlights the current user's row with a branded accent.
///
/// Usage:
/// ```swift
/// LeaderboardRow(entry: entry, isCurrentUser: true)
/// ```
public struct LeaderboardRow: View {

    // MARK: - Properties

    @Environment(ThemeEngine.self) private var themeEngine

    private let entry: LeaderboardEntry
    private let isCurrentUser: Bool

    // MARK: - Init

    /// Creates a leaderboard row.
    /// - Parameters:
    ///   - entry: The leaderboard entry to display.
    ///   - isCurrentUser: Whether this entry represents the current user.
    public init(entry: LeaderboardEntry, isCurrentUser: Bool = false) {
        self.entry = entry
        self.isCurrentUser = isCurrentUser
    }

    // MARK: - Body

    public var body: some View {
        HStack(spacing: RallySpacing.smMd) {
            // Rank
            rankView

            // Avatar
            avatarView

            // Name + tier
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: RallySpacing.xs) {
                    Text(entry.displayName)
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(isCurrentUser ? themeEngine.activeTheme.primaryColor : .white)
                        .lineLimit(1)

                    if isCurrentUser {
                        Text("You")
                            .font(RallyTypography.caption)
                            .foregroundStyle(themeEngine.activeTheme.primaryColor)
                            .padding(.horizontal, RallySpacing.sm)
                            .padding(.vertical, 1)
                            .background(
                                Capsule()
                                    .fill(themeEngine.activeTheme.primaryColor.opacity(0.15))
                            )
                    }
                }

                Text(entry.tier.rawValue)
                    .font(RallyTypography.caption)
                    .foregroundStyle(entry.tier.color)
            }

            Spacer()

            // Score
            Text(entry.score.abbreviated)
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(.white)
                .monospacedDigit()
        }
        .padding(.horizontal, RallySpacing.md)
        .padding(.vertical, RallySpacing.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .fill(isCurrentUser ? themeEngine.activeTheme.primaryColor.opacity(0.08) : .clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .strokeBorder(
                    isCurrentUser ? themeEngine.activeTheme.primaryColor.opacity(0.3) : .clear,
                    lineWidth: 1
                )
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabelText)
    }

    // MARK: - Subviews

    private var rankView: some View {
        Group {
            if entry.rank <= 3 {
                // Medal for top 3
                Image(systemName: medalIcon)
                    .font(.system(size: 20))
                    .foregroundStyle(medalColor)
                    .frame(width: 32, alignment: .center)
            } else {
                Text("#\(entry.rank)")
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(RallyColors.gray)
                    .monospacedDigit()
                    .frame(width: 32, alignment: .center)
            }
        }
    }

    @ViewBuilder
    private var avatarView: some View {
        if let avatarURL = entry.avatarURL {
            AsyncImage(url: avatarURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    avatarPlaceholder
                case .empty:
                    avatarPlaceholder
                        .overlay(ProgressView().scaleEffect(0.5))
                @unknown default:
                    avatarPlaceholder
                }
            }
            .frame(width: 40, height: 40)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(entry.tier.color.opacity(0.2))
            .frame(width: 40, height: 40)
            .overlay(
                Text(String(entry.displayName.prefix(1)).uppercased())
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(entry.tier.color)
            )
    }

    // MARK: - Helpers

    private var medalIcon: String {
        switch entry.rank {
        case 1: return "medal.fill"
        case 2: return "medal.fill"
        case 3: return "medal.fill"
        default: return "medal"
        }
    }

    private var medalColor: Color {
        switch entry.rank {
        case 1: return Color(red: 1.0, green: 0.84, blue: 0.0) // Gold
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.78) // Silver
        case 3: return Color(red: 0.80, green: 0.50, blue: 0.20) // Bronze
        default: return RallyColors.gray
        }
    }

    private var accessibilityLabelText: String {
        var label = "Rank \(entry.rank), \(entry.displayName), \(entry.score) points, \(entry.tier.rawValue) tier"
        if isCurrentUser {
            label += ", your position"
        }
        return label
    }
}

// MARK: - Preview

#Preview("Leaderboard") {
    let entries: [LeaderboardEntry] = [
        LeaderboardEntry(id: "1", userID: "u1", displayName: "Alex Thompson", score: 4850, rank: 1, tier: .mvp),
        LeaderboardEntry(id: "2", userID: "u2", displayName: "Jordan Lee", score: 3720, rank: 2, tier: .allStar),
        LeaderboardEntry(id: "3", userID: "u3", displayName: "Sam Rivera", score: 3100, rank: 3, tier: .allStar),
        LeaderboardEntry(id: "4", userID: "current", displayName: "You", score: 1250, rank: 12, tier: .starter),
        LeaderboardEntry(id: "5", userID: "u5", displayName: "Chris Park", score: 980, rank: 13, tier: .rookie),
    ]

    ScrollView {
        VStack(spacing: 4) {
            ForEach(entries) { entry in
                LeaderboardRow(
                    entry: entry,
                    isCurrentUser: entry.userID == "current"
                )
            }
        }
        .padding()
    }
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
