import SwiftUI
import RallyCore
import RallyUI

// MARK: - Tier Progress View

/// Displays the user's current loyalty tier, progress toward the next tier,
/// and an animated progress bar. Includes haptic feedback when the tier
/// changes.
public struct TierProgressView: View {
    let snapshot: TierSnapshot

    @State private var animatedProgress: Double = 0
    @State private var previousTier: Tier?

    public init(snapshot: TierSnapshot) {
        self.snapshot = snapshot
    }

    public var body: some View {
        VStack(spacing: SpacingToken.md) {
            // MARK: - Tier Badge & Label
            tierHeader

            // MARK: - Progress Bar
            progressBar

            // MARK: - Points Info
            pointsInfo

            // MARK: - All Tiers
            allTiersRow
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
        .rallyCardShadow()
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animatedProgress = snapshot.progress
            }
        }
        .onChange(of: snapshot.currentTier) { oldTier, newTier in
            if oldTier != newTier {
                // Haptic feedback on tier change
                let generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)

                // Re-animate progress bar from zero for the new tier.
                animatedProgress = 0
                withAnimation(.easeOut(duration: 0.8).delay(0.3)) {
                    animatedProgress = snapshot.progress
                }
            }
        }
        .onChange(of: snapshot.progress) { _, newValue in
            withAnimation(.easeOut(duration: 0.6)) {
                animatedProgress = newValue
            }
        }
    }

    // MARK: - Tier Header

    private var tierHeader: some View {
        HStack(spacing: SpacingToken.smMd) {
            // Tier icon
            ZStack {
                Circle()
                    .fill(snapshot.currentTier.color.opacity(0.2))
                    .frame(width: 48, height: 48)
                Image(systemName: tierIconName)
                    .font(.system(size: 22))
                    .foregroundStyle(snapshot.currentTier.color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Current Tier")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                Text(snapshot.currentTier.rawValue)
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)
            }

            Spacer()

            // Points display
            VStack(alignment: .trailing, spacing: 2) {
                Text(snapshot.currentBalance.pointsFormatted)
                    .font(RallyTypography.pointsDisplay)
                    .foregroundStyle(RallyColors.orange)
                Text("balance")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        VStack(spacing: SpacingToken.sm) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Track
                    Capsule()
                        .fill(RallyColors.navy)
                        .frame(height: 10)

                    // Fill
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    snapshot.currentTier.color,
                                    snapshot.nextTier?.color ?? snapshot.currentTier.color
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: max(10, geometry.size.width * animatedProgress),
                            height: 10
                        )

                    // Indicator dot at the leading edge of the fill.
                    Circle()
                        .fill(.white)
                        .frame(width: 16, height: 16)
                        .shadow(color: snapshot.currentTier.color.opacity(0.5), radius: 4)
                        .offset(x: max(0, geometry.size.width * animatedProgress - 8))
                }
            }
            .frame(height: 16)
        }
    }

    // MARK: - Points Info

    private var pointsInfo: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(snapshot.lifetimePoints.abbreviated) lifetime pts")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            Spacer()

            if let nextTier = snapshot.nextTier, let pointsNeeded = snapshot.pointsToNextTier {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(pointsNeeded.pointsFormatted) to \(nextTier.rawValue)")
                        .font(RallyTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(nextTier.color)
                }
            } else {
                Text("Max tier reached!")
                    .font(RallyTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(RallyColors.success)
            }
        }
    }

    // MARK: - All Tiers Row

    private var allTiersRow: some View {
        HStack(spacing: 0) {
            ForEach(Tier.allCases, id: \.self) { tier in
                VStack(spacing: SpacingToken.xs) {
                    Circle()
                        .fill(tier <= snapshot.currentTier ? tier.color : RallyColors.navy)
                        .frame(width: 10, height: 10)
                        .overlay {
                            if tier == snapshot.currentTier {
                                Circle()
                                    .strokeBorder(tier.color, lineWidth: 2)
                                    .frame(width: 18, height: 18)
                            }
                        }

                    Text(tierAbbreviation(tier))
                        .font(.system(size: 9, weight: tier == snapshot.currentTier ? .bold : .regular))
                        .foregroundStyle(
                            tier <= snapshot.currentTier ? tier.color : RallyColors.gray.opacity(0.6)
                        )
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Helpers

    private var tierIconName: String {
        switch snapshot.currentTier {
        case .rookie: return "person.fill"
        case .starter: return "star.fill"
        case .allStar: return "star.circle.fill"
        case .mvp: return "trophy.fill"
        case .hallOfFame: return "crown.fill"
        }
    }

    private func tierAbbreviation(_ tier: Tier) -> String {
        switch tier {
        case .rookie: return "RK"
        case .starter: return "ST"
        case .allStar: return "AS"
        case .mvp: return "MVP"
        case .hallOfFame: return "HOF"
        }
    }
}

// MARK: - Compact Variant

/// A smaller inline version of tier progress suitable for dashboard cards.
public struct CompactTierProgressView: View {
    let snapshot: TierSnapshot

    @State private var animatedProgress: Double = 0

    public init(snapshot: TierSnapshot) {
        self.snapshot = snapshot
    }

    public var body: some View {
        HStack(spacing: SpacingToken.smMd) {
            // Tier icon
            ZStack {
                Circle()
                    .fill(snapshot.currentTier.color.opacity(0.2))
                    .frame(width: 36, height: 36)
                Image(systemName: "crown.fill")
                    .font(.caption)
                    .foregroundStyle(snapshot.currentTier.color)
            }

            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                HStack {
                    Text(snapshot.currentTier.rawValue)
                        .font(RallyTypography.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                    Spacer()
                    if let nextTier = snapshot.nextTier, let pts = snapshot.pointsToNextTier {
                        Text("\(pts.abbreviated) to \(nextTier.rawValue)")
                            .font(RallyTypography.caption)
                            .foregroundStyle(RallyColors.gray)
                    }
                }

                // Mini progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(RallyColors.navy)
                            .frame(height: 4)
                        Capsule()
                            .fill(snapshot.currentTier.color)
                            .frame(width: max(4, geometry.size.width * animatedProgress), height: 4)
                    }
                }
                .frame(height: 4)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                animatedProgress = snapshot.progress
            }
        }
    }
}

// MARK: - Preview

#Preview("Tier Progress - Starter") {
    TierProgressView(
        snapshot: TierSnapshot(
            currentTier: .starter,
            lifetimePoints: 1250,
            currentBalance: 800,
            nextTier: .allStar,
            pointsToNextTier: 750,
            progress: 0.5
        )
    )
    .padding()
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}

#Preview("Tier Progress - Hall of Fame") {
    TierProgressView(
        snapshot: TierSnapshot(
            currentTier: .hallOfFame,
            lifetimePoints: 22_000,
            currentBalance: 8_500,
            nextTier: nil,
            pointsToNextTier: nil,
            progress: 1.0
        )
    )
    .padding()
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}

#Preview("Compact Tier Progress") {
    CompactTierProgressView(
        snapshot: TierSnapshot(
            currentTier: .allStar,
            lifetimePoints: 3500,
            currentBalance: 1200,
            nextTier: .mvp,
            pointsToNextTier: 1500,
            progress: 0.5
        )
    )
    .padding()
    .background(RallyColors.navyMid)
    .environment(ThemeEngine())
}
