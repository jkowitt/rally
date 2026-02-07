import SwiftUI
import RallyCore

/// Reward catalog row displaying the reward image, title, point cost, and a
/// redeem call-to-action button.
///
/// Usage:
/// ```swift
/// RewardRow(reward: reward, userPoints: 1200) {
///     redeemReward(reward)
/// }
/// ```
public struct RewardRow: View {

    // MARK: - Properties

    private let reward: Reward
    private let userPoints: Int
    private let onRedeem: (() -> Void)?

    private var canAfford: Bool {
        userPoints >= reward.pointsCost
    }

    // MARK: - Init

    /// Creates a reward row.
    /// - Parameters:
    ///   - reward: The reward to display.
    ///   - userPoints: The user's current point balance, used to determine CTA state.
    ///   - onRedeem: Closure invoked when the user taps the redeem button.
    public init(
        reward: Reward,
        userPoints: Int = 0,
        onRedeem: (() -> Void)? = nil
    ) {
        self.reward = reward
        self.userPoints = userPoints
        self.onRedeem = onRedeem
    }

    // MARK: - Body

    public var body: some View {
        HStack(spacing: RallySpacing.smMd) {
            // Reward image
            rewardImage

            // Text content
            VStack(alignment: .leading, spacing: RallySpacing.xs) {
                Text(reward.title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                    .lineLimit(2)

                HStack(spacing: RallySpacing.xs) {
                    categoryBadge

                    if let tier = tierBadge {
                        tier
                    }
                }

                // Points cost
                HStack(spacing: RallySpacing.xs) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(RallyColors.orange)

                    Text(reward.pointsCost.pointsFormatted)
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(canAfford ? RallyColors.orange : RallyColors.gray)
                }
            }

            Spacer()

            // Redeem CTA
            redeemButton
        }
        .padding(RallySpacing.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
        .rallyCardShadow()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabelText)
        .accessibilityAddTraits(canAfford ? .isButton : [])
    }

    // MARK: - Subviews

    @ViewBuilder
    private var rewardImage: some View {
        if let imageURL = reward.imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    imagePlaceholder
                case .empty:
                    ProgressView()
                        .frame(width: 72, height: 72)
                @unknown default:
                    imagePlaceholder
                }
            }
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous))
        } else {
            imagePlaceholder
        }
    }

    private var imagePlaceholder: some View {
        RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
            .fill(RallyColors.navy)
            .frame(width: 72, height: 72)
            .overlay(
                Image(systemName: categoryIcon)
                    .font(.system(size: 24))
                    .foregroundStyle(RallyColors.gray.opacity(0.6))
            )
    }

    private var categoryBadge: some View {
        Text(reward.category.rawValue.capitalized)
            .font(RallyTypography.caption)
            .foregroundStyle(RallyColors.blue)
            .padding(.horizontal, RallySpacing.sm)
            .padding(.vertical, 2)
            .background(
                Capsule()
                    .fill(RallyColors.blue.opacity(0.12))
            )
    }

    @ViewBuilder
    private var tierBadge: some View? {
        if reward.minimumTier != .rookie {
            Text(reward.minimumTier.rawValue)
                .font(RallyTypography.caption)
                .foregroundStyle(reward.minimumTier.color)
                .padding(.horizontal, RallySpacing.sm)
                .padding(.vertical, 2)
                .background(
                    Capsule()
                        .fill(reward.minimumTier.color.opacity(0.12))
                )
        }
    }

    private var redeemButton: some View {
        Button {
            if canAfford {
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
                onRedeem?()
            }
        } label: {
            Text(canAfford ? "Redeem" : "Need more")
                .font(RallyTypography.caption)
                .fontWeight(.semibold)
                .foregroundStyle(canAfford ? .white : RallyColors.gray)
                .padding(.horizontal, RallySpacing.smMd)
                .padding(.vertical, RallySpacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                        .fill(canAfford ? RallyColors.orange : RallyColors.navy)
                )
        }
        .disabled(!canAfford)
        .accessibilityLabel(canAfford ? "Redeem \(reward.title)" : "Not enough points for \(reward.title)")
    }

    // MARK: - Helpers

    private var categoryIcon: String {
        switch reward.category {
        case .merchandise: return "tshirt.fill"
        case .concessions: return "cup.and.saucer.fill"
        case .experiences: return "ticket.fill"
        case .tickets: return "ticket.fill"
        case .digital: return "gift.fill"
        case .partner: return "storefront.fill"
        }
    }

    private var accessibilityLabelText: String {
        var label = "\(reward.title), \(reward.pointsCost) points"
        if canAfford {
            label += ", available to redeem"
        } else {
            label += ", need \(reward.pointsCost - userPoints) more points"
        }
        return label
    }
}

// MARK: - Preview

#Preview("Reward Rows") {
    let rewards: [Reward] = [
        Reward(
            id: "1",
            schoolID: "s1",
            title: "Team T-Shirt",
            description: "Official team merchandise",
            pointsCost: 500,
            category: .merchandise
        ),
        Reward(
            id: "2",
            schoolID: "s1",
            title: "VIP Sideline Experience",
            description: "Watch warm-ups from the sideline",
            pointsCost: 5000,
            category: .experiences,
            minimumTier: .mvp
        ),
        Reward(
            id: "3",
            schoolID: "s1",
            title: "Free Hot Dog Combo",
            description: "Hot dog, chips, and drink",
            pointsCost: 200,
            category: .concessions
        ),
    ]

    ScrollView {
        VStack(spacing: 12) {
            ForEach(rewards) { reward in
                RewardRow(reward: reward, userPoints: 1200)
            }
        }
        .padding()
    }
    .background(RallyColors.navy)
}
