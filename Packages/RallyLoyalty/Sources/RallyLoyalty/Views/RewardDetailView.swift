import SwiftUI
import RallyCore
import RallyUI

// MARK: - Reward Detail View

/// Full-screen detail view for a single reward, including hero image,
/// description, tier requirement, and a redeem call-to-action button.
public struct RewardDetailView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @Environment(\.dismiss) private var dismiss

    let reward: Reward
    @Bindable private var viewModel: RewardsViewModel

    @State private var showRedemptionConfirmation = false
    @State private var animateHeart = false

    public init(reward: Reward, viewModel: RewardsViewModel) {
        self.reward = reward
        self.viewModel = viewModel
    }

    private var canRedeem: Bool {
        viewModel.canRedeem(reward)
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: - Hero Image
                heroImage

                // MARK: - Content
                VStack(alignment: .leading, spacing: SpacingToken.lg) {
                    headerSection
                    Divider().overlay(RallyColors.navyMid)
                    detailsSection
                    tierRequirementSection
                    if let expiresAt = reward.expiresAt {
                        expirationBanner(expiresAt)
                    }
                    Spacer(minLength: SpacingToken.xxxl)
                }
                .padding(.horizontal, SpacingToken.md)
                .padding(.top, SpacingToken.lg)
            }
        }
        .background(RallyColors.navy.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            redeemButton
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showRedemptionConfirmation) {
            RedemptionConfirmationView(
                reward: reward,
                viewModel: viewModel
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Hero Image

    private var heroImage: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: reward.imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    imagePlaceholder
                case .empty:
                    imagePlaceholder.shimmer()
                @unknown default:
                    imagePlaceholder
                }
            }
            .frame(height: 260)
            .clipped()

            // Gradient overlay for text legibility
            LinearGradient(
                colors: [.clear, RallyColors.navy.opacity(0.9)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 120)

            // Category pill
            HStack {
                Text(reward.category.displayName)
                    .font(RallyTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, SpacingToken.smMd)
                    .padding(.vertical, SpacingToken.xs)
                    .background(
                        Capsule()
                            .fill(RallyColors.orange.opacity(0.85))
                    )
                Spacer()
            }
            .padding(SpacingToken.md)
        }
    }

    private var imagePlaceholder: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [RallyColors.navyMid, RallyColors.navy],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay {
                Image(systemName: reward.category.iconName)
                    .font(.system(size: 56))
                    .foregroundStyle(RallyColors.gray.opacity(0.3))
            }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: SpacingToken.sm) {
            Text(reward.title)
                .font(RallyTypography.sectionHeader)
                .foregroundStyle(.white)

            HStack(spacing: SpacingToken.smMd) {
                // Points cost
                HStack(spacing: SpacingToken.xs) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(RallyColors.orange)
                    Text(reward.pointsCost.pointsFormatted)
                        .font(RallyTypography.pointsDisplay)
                        .foregroundStyle(.white)
                }

                Spacer()

                // Balance indicator
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Your balance")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                    Text(viewModel.currentBalance.pointsFormatted)
                        .font(RallyTypography.subtitle)
                        .fontWeight(.bold)
                        .foregroundStyle(canRedeem ? RallyColors.success : RallyColors.error)
                }
            }
        }
    }

    // MARK: - Details

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: SpacingToken.smMd) {
            Text("About this reward")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)

            Text(reward.description)
                .font(RallyTypography.body)
                .foregroundStyle(RallyColors.gray)
                .fixedSize(horizontal: false, vertical: true)

            if let sponsorID = reward.sponsorID {
                HStack(spacing: SpacingToken.sm) {
                    Image(systemName: "building.2")
                        .foregroundStyle(RallyColors.gray)
                    Text("Sponsored by \(sponsorID)")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                }
            }

            if let inventory = reward.inventory {
                HStack(spacing: SpacingToken.sm) {
                    Image(systemName: "cube.box")
                        .foregroundStyle(inventory > 10 ? RallyColors.gray : RallyColors.warning)
                    Text("\(inventory) remaining")
                        .font(RallyTypography.caption)
                        .foregroundStyle(inventory > 10 ? RallyColors.gray : RallyColors.warning)
                }
            }
        }
    }

    // MARK: - Tier Requirement

    private var tierRequirementSection: some View {
        HStack(spacing: SpacingToken.smMd) {
            Circle()
                .fill(reward.minimumTier.color)
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: 2) {
                Text("Minimum Tier")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                Text(reward.minimumTier.rawValue)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
            }

            Spacer()

            if reward.minimumTier <= viewModel.currentTier {
                Label("Eligible", systemImage: "checkmark.seal.fill")
                    .font(RallyTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(RallyColors.success)
            } else {
                Label("Tier locked", systemImage: "lock.fill")
                    .font(RallyTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(RallyColors.error)
            }
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
    }

    // MARK: - Expiration

    private func expirationBanner(_ date: Date) -> some View {
        HStack(spacing: SpacingToken.sm) {
            Image(systemName: "clock")
                .foregroundStyle(RallyColors.warning)
            Text("Expires \(date.relativeDescription)")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.warning)
            Spacer()
        }
        .padding(SpacingToken.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .fill(RallyColors.warning.opacity(0.12))
        )
    }

    // MARK: - Redeem Button

    private var redeemButton: some View {
        VStack(spacing: 0) {
            Divider().overlay(RallyColors.navyMid)

            if let reason = viewModel.ineligibilityReason(for: reward) {
                Button {} label: {
                    HStack {
                        Image(systemName: "lock.fill")
                        Text(reason)
                    }
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(.white.opacity(0.5))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(RallyColors.gray.opacity(0.3))
                    )
                }
                .disabled(true)
                .padding(SpacingToken.md)
            } else {
                Button {
                    showRedemptionConfirmation = true
                } label: {
                    HStack {
                        Image(systemName: "gift.fill")
                        Text("Redeem for \(reward.pointsCost.pointsFormatted)")
                    }
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(LinearGradient.rallyBrand)
                    )
                }
                .padding(SpacingToken.md)
            }
        }
        .background(RallyColors.navy)
    }
}

// MARK: - Preview

#Preview("Reward Detail") {
    NavigationStack {
        RewardDetailView(
            reward: Reward(
                id: "preview-1",
                schoolID: "school-1",
                title: "Exclusive Team Jersey",
                description: "Get an authentic team jersey signed by the starting lineup. Available exclusively for All-Star tier members and above. Limited quantities available while supplies last.",
                pointsCost: 2500,
                imageURL: nil,
                category: .merchandise,
                minimumTier: .allStar,
                inventory: 15,
                expiresAt: Calendar.current.date(byAdding: .day, value: 14, to: .now)
            ),
            viewModel: {
                // Note: Preview uses placeholder — real app injects live dependencies.
                let vm = RewardsViewModel.__previewStub()
                return vm
            }()
        )
    }
    .environment(ThemeEngine())
}

// MARK: - Preview Helpers

extension RewardsViewModel {
    /// Creates a stub instance for SwiftUI previews only.
    @MainActor
    static func __previewStub() -> RewardsViewModel {
        RewardsViewModel(
            rewardRepository: PreviewRewardRepository(),
            pointsEngine: PointsEngine(
                pointsRepository: PreviewPointsRepository(),
                rewardRepository: PreviewRewardRepository(),
                initialBalance: 3200,
                initialLifetimePoints: 4800
            ),
            schoolID: "preview"
        )
    }
}

/// Stub reward repository for previews.
struct PreviewRewardRepository: RewardRepositoryProtocol {
    func fetchRewards(schoolID: String) async throws -> [Reward] { [] }
    func redeemReward(id: String) async throws -> RedemptionResult {
        RedemptionResult(
            redemption: Redemption(id: "r1", rewardID: id, userID: "u1", pointsSpent: 0),
            newBalance: 0
        )
    }
    func fetchRedemptionHistory() async throws -> [Redemption] { [] }
}

/// Stub points repository for previews.
struct PreviewPointsRepository: PointsRepositoryProtocol {
    func fetchTransactions(page: Int, pageSize: Int) async throws -> PaginatedResponse<PointsTransaction> {
        PaginatedResponse(items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1)
    }
    func fetchBalance() async throws -> Int { 3200 }
    func reconcile() async throws {}
}
