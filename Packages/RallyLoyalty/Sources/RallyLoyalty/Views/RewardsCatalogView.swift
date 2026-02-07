import SwiftUI
import RallyCore
import RallyUI

// MARK: - Rewards Catalog View

/// Displays the rewards catalog as a searchable, filterable grid.
///
/// Supports two layout modes (grid and list), category chip filters, and a
/// search bar. Rewards the user cannot yet access are shown with a locked
/// overlay indicating the tier requirement.
public struct RewardsCatalogView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @Bindable private var viewModel: RewardsViewModel

    @State private var layoutMode: LayoutMode = .grid
    @State private var selectedReward: Reward?

    public init(viewModel: RewardsViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SpacingToken.md) {
                    // MARK: - Search Bar
                    searchBar

                    // MARK: - Category Filter Chips
                    categoryChips

                    // MARK: - Toggle Filters
                    filterToggles

                    // MARK: - Content
                    if viewModel.isLoading {
                        loadingPlaceholder
                    } else if let error = viewModel.error {
                        errorView(error)
                    } else if viewModel.filteredRewards.isEmpty {
                        emptyState
                    } else {
                        rewardContent
                    }
                }
                .padding(.horizontal, SpacingToken.md)
                .padding(.bottom, SpacingToken.xl)
            }
            .background(RallyColors.navy.ignoresSafeArea())
            .navigationTitle("Rewards")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            layoutMode = layoutMode == .grid ? .list : .grid
                        }
                    } label: {
                        Image(systemName: layoutMode == .grid ? "list.bullet" : "square.grid.2x2")
                            .foregroundStyle(RallyColors.orange)
                    }
                }
            }
            .navigationDestination(item: $selectedReward) { reward in
                RewardDetailView(
                    reward: reward,
                    viewModel: viewModel
                )
            }
            .task {
                await viewModel.loadCatalog()
            }
            .refreshable {
                await viewModel.loadCatalog()
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: SpacingToken.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(RallyColors.gray)
            TextField("Search rewards...", text: $viewModel.searchQuery)
                .font(RallyTypography.body)
                .foregroundStyle(.white)
                .autocorrectionDisabled()
            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(RallyColors.gray)
                }
            }
        }
        .padding(SpacingToken.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                .fill(RallyColors.navyMid)
        )
    }

    // MARK: - Category Chips

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SpacingToken.sm) {
                categoryChip(title: "All", category: nil)
                ForEach(RewardCategory.allCases, id: \.self) { category in
                    categoryChip(title: category.displayName, category: category)
                }
            }
        }
    }

    private func categoryChip(title: String, category: RewardCategory?) -> some View {
        let isSelected = viewModel.selectedCategory == category
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.selectedCategory = category
            }
        } label: {
            Text(title)
                .font(RallyTypography.caption)
                .fontWeight(.semibold)
                .foregroundStyle(isSelected ? .white : RallyColors.gray)
                .padding(.horizontal, SpacingToken.smMd)
                .padding(.vertical, SpacingToken.sm)
                .background(
                    Capsule()
                        .fill(isSelected ? RallyColors.orange : RallyColors.navyMid)
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Filter Toggles

    private var filterToggles: some View {
        HStack(spacing: SpacingToken.md) {
            Toggle(isOn: $viewModel.showEligibleOnly) {
                Label("My Tier", systemImage: "crown")
                    .font(RallyTypography.caption)
                    .foregroundStyle(.white)
            }
            .toggleStyle(.button)
            .tint(RallyColors.orange)

            Toggle(isOn: $viewModel.showAffordableOnly) {
                Label("Can Afford", systemImage: "dollarsign.circle")
                    .font(RallyTypography.caption)
                    .foregroundStyle(.white)
            }
            .toggleStyle(.button)
            .tint(RallyColors.orange)

            Spacer()

            Text("\(viewModel.filteredRewards.count) rewards")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
        }
    }

    // MARK: - Reward Content

    @ViewBuilder
    private var rewardContent: some View {
        switch layoutMode {
        case .grid:
            rewardGrid
        case .list:
            rewardList
        }
    }

    private var rewardGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: SpacingToken.smMd),
                GridItem(.flexible(), spacing: SpacingToken.smMd)
            ],
            spacing: SpacingToken.smMd
        ) {
            ForEach(viewModel.filteredRewards) { reward in
                RewardCardView(
                    reward: reward,
                    canRedeem: viewModel.canRedeem(reward),
                    currentTier: viewModel.currentTier,
                    layout: .grid
                )
                .onTapGesture { selectedReward = reward }
            }
        }
    }

    private var rewardList: some View {
        LazyVStack(spacing: SpacingToken.smMd) {
            ForEach(viewModel.filteredRewards) { reward in
                RewardCardView(
                    reward: reward,
                    canRedeem: viewModel.canRedeem(reward),
                    currentTier: viewModel.currentTier,
                    layout: .list
                )
                .onTapGesture { selectedReward = reward }
            }
        }
    }

    // MARK: - States

    private var loadingPlaceholder: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: SpacingToken.smMd),
                GridItem(.flexible(), spacing: SpacingToken.smMd)
            ],
            spacing: SpacingToken.smMd
        ) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(RallyColors.navyMid)
                    .frame(height: 180)
                    .shimmer()
            }
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundStyle(RallyColors.warning)
            Text(message)
                .font(RallyTypography.body)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
            Button("Retry") {
                Task { await viewModel.loadCatalog() }
            }
            .font(RallyTypography.buttonLabel)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.lg)
            .padding(.vertical, SpacingToken.smMd)
            .background(
                Capsule().fill(RallyColors.orange)
            )
        }
        .padding(.top, SpacingToken.xxxl)
    }

    private var emptyState: some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "gift")
                .font(.system(size: 48))
                .foregroundStyle(RallyColors.gray)
            Text("No rewards found")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)
            Text("Try adjusting your filters or check back later.")
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
        }
        .padding(.top, SpacingToken.xxxl)
    }

    // MARK: - Layout Mode

    private enum LayoutMode {
        case grid, list
    }
}

// MARK: - Reward Card View

/// A single reward card used in both grid and list layouts.
struct RewardCardView: View {
    let reward: Reward
    let canRedeem: Bool
    let currentTier: Tier
    let layout: Layout

    enum Layout {
        case grid, list
    }

    var body: some View {
        Group {
            switch layout {
            case .grid:
                gridCard
            case .list:
                listCard
            }
        }
    }

    private var gridCard: some View {
        VStack(alignment: .leading, spacing: SpacingToken.sm) {
            // Image placeholder
            ZStack(alignment: .topTrailing) {
                rewardImage
                    .frame(height: 100)
                    .clipped()

                if reward.minimumTier > currentTier {
                    tierBadge
                }
            }

            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                Text(reward.title)
                    .font(RallyTypography.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .lineLimit(2)

                Text(reward.pointsCost.pointsFormatted)
                    .font(RallyTypography.caption)
                    .foregroundStyle(canRedeem ? RallyColors.orange : RallyColors.gray)
            }
            .padding(.horizontal, SpacingToken.sm)
            .padding(.bottom, SpacingToken.sm)
        }
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
        .overlay {
            if reward.minimumTier > currentTier {
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(.black.opacity(0.3))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous))
        .rallyCardShadow()
    }

    private var listCard: some View {
        HStack(spacing: SpacingToken.smMd) {
            rewardImage
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous))

            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                Text(reward.title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(reward.category.displayName)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)

                Text(reward.pointsCost.pointsFormatted)
                    .font(RallyTypography.subtitle)
                    .fontWeight(.bold)
                    .foregroundStyle(canRedeem ? RallyColors.orange : RallyColors.gray)
            }

            Spacer()

            if reward.minimumTier > currentTier {
                tierBadge
            } else {
                Image(systemName: "chevron.right")
                    .foregroundStyle(RallyColors.gray)
            }
        }
        .padding(SpacingToken.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
        .opacity(reward.minimumTier > currentTier ? 0.7 : 1.0)
        .rallyCardShadow()
    }

    private var rewardImage: some View {
        AsyncImage(url: reward.imageURL) { phase in
            switch phase {
            case .success(let image):
                image.resizable().aspectRatio(contentMode: .fill)
            case .failure:
                imagePlaceholder
            case .empty:
                imagePlaceholder.shimmer()
            @unknown default:
                imagePlaceholder
            }
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
                    .font(.title2)
                    .foregroundStyle(RallyColors.gray.opacity(0.5))
            }
    }

    private var tierBadge: some View {
        HStack(spacing: 2) {
            Image(systemName: "lock.fill")
                .font(.caption2)
            Text(reward.minimumTier.rawValue)
                .font(RallyTypography.caption)
                .fontWeight(.semibold)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, SpacingToken.sm)
        .padding(.vertical, SpacingToken.xs)
        .background(
            Capsule()
                .fill(reward.minimumTier.color.opacity(0.85))
        )
        .padding(SpacingToken.sm)
    }
}

// MARK: - Category Helpers

extension RewardCategory {
    /// Human-readable display name.
    var displayName: String {
        switch self {
        case .merchandise: return "Merch"
        case .concessions: return "Food & Drink"
        case .experiences: return "Experiences"
        case .tickets: return "Tickets"
        case .digital: return "Digital"
        case .partner: return "Partner"
        }
    }

    /// SF Symbol icon for the category.
    var iconName: String {
        switch self {
        case .merchandise: return "tshirt"
        case .concessions: return "cup.and.saucer"
        case .experiences: return "star"
        case .tickets: return "ticket"
        case .digital: return "iphone"
        case .partner: return "handshake"
        }
    }
}

// MARK: - Preview

#Preview("Rewards Catalog") {
    // Preview requires stub dependencies; shown with mock data.
    Text("RewardsCatalogView")
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RallyColors.navy)
        .environment(ThemeEngine())
}
