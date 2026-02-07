import SwiftUI
import RallyCore
import RallyUI

// MARK: - Points History View

/// Displays the full transaction history with date-grouped sections,
/// type/source filters, and infinite-scroll pagination.
public struct PointsHistoryView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @Bindable private var viewModel: PointsHistoryViewModel

    @State private var showFilters = false

    public init(viewModel: PointsHistoryViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                RallyColors.navy.ignoresSafeArea()

                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.error, viewModel.transactions.isEmpty {
                    errorView(error)
                } else if viewModel.transactions.isEmpty {
                    emptyView
                } else {
                    transactionList
                }
            }
            .navigationTitle("Points History")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterButton
                }
            }
            .sheet(isPresented: $showFilters) {
                filterSheet
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .task {
                await viewModel.loadInitialHistory()
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
    }

    // MARK: - Transaction List

    private var transactionList: some View {
        ScrollView {
            // Balance header
            balanceHeader
                .padding(.horizontal, SpacingToken.md)
                .padding(.bottom, SpacingToken.sm)

            // Active filters indicator
            if viewModel.selectedType != nil || viewModel.selectedSource != nil {
                activeFiltersBar
                    .padding(.horizontal, SpacingToken.md)
            }

            LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                ForEach(viewModel.groupedTransactions) { group in
                    Section {
                        ForEach(group.transactions) { transaction in
                            TransactionRowView(transaction: transaction)
                                .onAppear {
                                    Task {
                                        await viewModel.loadNextPageIfNeeded(currentItem: transaction)
                                    }
                                }
                        }
                    } header: {
                        sectionHeader(for: group)
                    }
                }

                if viewModel.isLoadingMore {
                    ProgressView()
                        .tint(RallyColors.orange)
                        .padding(SpacingToken.lg)
                }

                if viewModel.hasReachedEnd && !viewModel.transactions.isEmpty {
                    Text("You have reached the beginning of your history.")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                        .padding(SpacingToken.lg)
                }
            }
        }
    }

    // MARK: - Balance Header

    private var balanceHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                Text("Current Balance")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                Text(viewModel.currentBalance.pointsFormatted)
                    .font(RallyTypography.pointsDisplay)
                    .foregroundStyle(RallyColors.orange)
            }
            Spacer()
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
    }

    // MARK: - Section Header

    private func sectionHeader(for group: TransactionGroup) -> some View {
        HStack {
            Text(group.headerTitle)
                .font(RallyTypography.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Spacer()

            let netPoints = group.netPoints
            Text(netPoints >= 0 ? "+\(netPoints.pointsFormatted)" : "\(netPoints.pointsFormatted)")
                .font(RallyTypography.caption)
                .foregroundStyle(netPoints >= 0 ? RallyColors.success : RallyColors.error)
        }
        .padding(.horizontal, SpacingToken.md)
        .padding(.vertical, SpacingToken.sm)
        .background(RallyColors.navy)
    }

    // MARK: - Filter Button

    private var filterButton: some View {
        Button {
            showFilters = true
        } label: {
            HStack(spacing: SpacingToken.xs) {
                Image(systemName: "line.3.horizontal.decrease.circle")
                if viewModel.selectedType != nil || viewModel.selectedSource != nil {
                    Circle()
                        .fill(RallyColors.orange)
                        .frame(width: 8, height: 8)
                }
            }
            .foregroundStyle(RallyColors.orange)
        }
    }

    // MARK: - Active Filters Bar

    private var activeFiltersBar: some View {
        HStack(spacing: SpacingToken.sm) {
            if let type = viewModel.selectedType {
                filterChip(label: type.rawValue.capitalized) {
                    viewModel.selectedType = nil
                }
            }
            if let source = viewModel.selectedSource {
                filterChip(label: source.displayLabel) {
                    viewModel.selectedSource = nil
                }
            }
            Spacer()
            Button("Clear All") {
                viewModel.clearFilters()
            }
            .font(RallyTypography.caption)
            .foregroundStyle(RallyColors.orange)
        }
    }

    private func filterChip(label: String, onRemove: @escaping () -> Void) -> some View {
        HStack(spacing: SpacingToken.xs) {
            Text(label)
                .font(RallyTypography.caption)
                .foregroundStyle(.white)
            Button {
                onRemove()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(RallyColors.gray)
            }
        }
        .padding(.horizontal, SpacingToken.smMd)
        .padding(.vertical, SpacingToken.xs)
        .background(
            Capsule().fill(RallyColors.navyMid)
        )
    }

    // MARK: - Filter Sheet

    private var filterSheet: some View {
        NavigationStack {
            List {
                Section("Transaction Type") {
                    ForEach(TransactionType.allFilterCases, id: \.self) { type in
                        Button {
                            viewModel.selectedType = viewModel.selectedType == type ? nil : type
                        } label: {
                            HStack {
                                Text(type.rawValue.capitalized)
                                    .foregroundStyle(.white)
                                Spacer()
                                if viewModel.selectedType == type {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(RallyColors.orange)
                                }
                            }
                        }
                    }
                }

                Section("Source") {
                    ForEach(TransactionSource.allFilterCases, id: \.self) { source in
                        Button {
                            viewModel.selectedSource = viewModel.selectedSource == source ? nil : source
                        } label: {
                            HStack {
                                Image(systemName: source.iconName)
                                    .frame(width: 24)
                                    .foregroundStyle(RallyColors.orange)
                                Text(source.displayLabel)
                                    .foregroundStyle(.white)
                                Spacer()
                                if viewModel.selectedSource == source {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(RallyColors.orange)
                                }
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(RallyColors.navy)
            .navigationTitle("Filter History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showFilters = false }
                        .foregroundStyle(RallyColors.orange)
                }
            }
        }
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: SpacingToken.md) {
            ForEach(0..<8, id: \.self) { _ in
                HStack(spacing: SpacingToken.smMd) {
                    Circle()
                        .fill(RallyColors.navyMid)
                        .frame(width: 40, height: 40)
                    VStack(alignment: .leading, spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(RallyColors.navyMid)
                            .frame(height: 14)
                            .frame(maxWidth: 160)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(RallyColors.navyMid)
                            .frame(height: 10)
                            .frame(maxWidth: 100)
                    }
                    Spacer()
                    RoundedRectangle(cornerRadius: 4)
                        .fill(RallyColors.navyMid)
                        .frame(width: 60, height: 14)
                }
                .padding(.horizontal, SpacingToken.md)
            }
        }
        .shimmer()
        .padding(.top, SpacingToken.lg)
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
                Task { await viewModel.loadInitialHistory() }
            }
            .font(RallyTypography.buttonLabel)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.lg)
            .padding(.vertical, SpacingToken.smMd)
            .background(Capsule().fill(RallyColors.orange))
        }
    }

    private var emptyView: some View {
        VStack(spacing: SpacingToken.md) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 48))
                .foregroundStyle(RallyColors.gray)
            Text("No transactions yet")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)
            Text("Start earning points by checking in to events and completing activations!")
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SpacingToken.xl)
        }
    }
}

// MARK: - Transaction Row View

/// A single row in the transaction history list.
struct TransactionRowView: View {
    let transaction: PointsTransaction

    var body: some View {
        HStack(spacing: SpacingToken.smMd) {
            // Source icon
            ZStack {
                Circle()
                    .fill(iconBackgroundColor.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: transaction.source.iconName)
                    .font(.system(size: 16))
                    .foregroundStyle(iconBackgroundColor)
            }

            // Description
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(RallyTypography.subtitle)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: SpacingToken.xs) {
                    Text(transaction.source.displayLabel)
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)

                    if !transaction.isReconciled {
                        Text("Pending")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(RallyColors.warning)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(
                                Capsule().fill(RallyColors.warning.opacity(0.15))
                            )
                    }
                }
            }

            Spacer()

            // Amount & time
            VStack(alignment: .trailing, spacing: 2) {
                Text(amountText)
                    .font(RallyTypography.subtitle)
                    .fontWeight(.bold)
                    .foregroundStyle(amountColor)

                Text(transaction.createdAt.relativeDescription)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }
        }
        .padding(.horizontal, SpacingToken.md)
        .padding(.vertical, SpacingToken.smMd)
    }

    private var amountText: String {
        let sign = transaction.amount >= 0 ? "+" : ""
        return "\(sign)\(transaction.amount) pts"
    }

    private var amountColor: Color {
        switch transaction.type {
        case .earned, .bonus:
            return RallyColors.success
        case .spent:
            return RallyColors.error
        case .adjustment:
            return transaction.amount >= 0 ? RallyColors.success : RallyColors.error
        case .expired:
            return RallyColors.warning
        }
    }

    private var iconBackgroundColor: Color {
        switch transaction.type {
        case .earned, .bonus: return RallyColors.success
        case .spent: return RallyColors.error
        case .adjustment: return RallyColors.blue
        case .expired: return RallyColors.warning
        }
    }
}

// MARK: - Transaction Source Helpers

extension TransactionSource {
    /// Human-readable label for the source.
    var displayLabel: String {
        switch self {
        case .checkIn: return "Check-In"
        case .prediction: return "Prediction"
        case .trivia: return "Trivia"
        case .noiseMeter: return "Noise Meter"
        case .poll: return "Poll"
        case .photoChallenge: return "Photo Challenge"
        case .reward: return "Reward"
        case .referral: return "Referral"
        case .streak: return "Streak Bonus"
        case .admin: return "Admin"
        case .content: return "Content"
        }
    }

    /// SF Symbol icon name.
    var iconName: String {
        switch self {
        case .checkIn: return "mappin.circle.fill"
        case .prediction: return "chart.line.uptrend.xyaxis"
        case .trivia: return "brain.head.profile"
        case .noiseMeter: return "speaker.wave.3.fill"
        case .poll: return "chart.bar.fill"
        case .photoChallenge: return "camera.fill"
        case .reward: return "gift.fill"
        case .referral: return "person.2.fill"
        case .streak: return "flame.fill"
        case .admin: return "wrench.and.screwdriver.fill"
        case .content: return "doc.text.fill"
        }
    }

    /// All cases used in the filter sheet.
    static var allFilterCases: [TransactionSource] {
        [.checkIn, .prediction, .trivia, .noiseMeter, .poll, .photoChallenge, .reward, .referral, .streak]
    }
}

// MARK: - Transaction Type Helpers

extension TransactionType {
    /// All cases shown in the filter sheet.
    static var allFilterCases: [TransactionType] {
        [.earned, .spent, .bonus, .adjustment]
    }
}

// MARK: - Preview

#Preview("Points History") {
    Text("PointsHistoryView")
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RallyColors.navy)
        .environment(ThemeEngine())
}

#Preview("Transaction Row - Earned") {
    TransactionRowView(
        transaction: PointsTransaction(
            id: "1",
            userID: "u1",
            amount: 100,
            type: .earned,
            source: .checkIn,
            description: "Game Day Check-In vs Michigan",
            createdAt: .now.addingTimeInterval(-3600)
        )
    )
    .background(RallyColors.navy)
}

#Preview("Transaction Row - Spent") {
    TransactionRowView(
        transaction: PointsTransaction(
            id: "2",
            userID: "u1",
            amount: -500,
            type: .spent,
            source: .reward,
            description: "Redeemed: Free Large Popcorn",
            createdAt: .now.addingTimeInterval(-7200),
            isReconciled: true
        )
    )
    .background(RallyColors.navy)
}
