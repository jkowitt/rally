import SwiftUI
import RallyCore

/// Skeleton placeholder view that matches common component shapes and displays
/// a shimmer animation while content is loading.
///
/// Usage:
/// ```swift
/// LoadingShimmer(shape: .card)
/// LoadingShimmer(shape: .row, count: 3)
/// ```
public struct LoadingShimmer: View {

    // MARK: - Shape

    /// Predefined skeleton shapes matching Rally UI component layouts.
    public enum Shape {
        /// Full-width card skeleton (matches RallyCard / ActivationCard).
        case card
        /// Horizontal row skeleton (matches RewardRow / LeaderboardRow).
        case row
        /// Circular badge skeleton (matches PointsBadge).
        case circle(diameter: CGFloat = 72)
        /// Banner skeleton (matches SchoolHeader).
        case banner
        /// Custom rectangular skeleton.
        case rectangle(width: CGFloat? = nil, height: CGFloat)
    }

    // MARK: - Properties

    private let shape: Shape
    private let count: Int

    @State private var phase: CGFloat = 0

    // MARK: - Init

    /// Creates a loading shimmer placeholder.
    /// - Parameters:
    ///   - shape: The skeleton shape to render (default `.card`).
    ///   - count: Number of skeleton items to stack (default `1`).
    public init(shape: Shape = .card, count: Int = 1) {
        self.shape = shape
        self.count = max(1, count)
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: RallySpacing.smMd) {
            ForEach(0..<count, id: \.self) { index in
                shimmerContent
                    .animation(
                        .linear(duration: 1.5)
                        .repeatForever(autoreverses: false)
                        .delay(Double(index) * 0.15),
                        value: phase
                    )
            }
        }
        .onAppear {
            phase = 1
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading content")
        .accessibilityAddTraits(.updatesFrequently)
    }

    // MARK: - Shape Rendering

    @ViewBuilder
    private var shimmerContent: some View {
        switch shape {
        case .card:
            cardSkeleton
        case .row:
            rowSkeleton
        case .circle(let diameter):
            circleSkeleton(diameter: diameter)
        case .banner:
            bannerSkeleton
        case .rectangle(let width, let height):
            rectangleSkeleton(width: width, height: height)
        }
    }

    // MARK: - Card Skeleton

    private var cardSkeleton: some View {
        VStack(alignment: .leading, spacing: RallySpacing.smMd) {
            // Icon placeholder
            shimmerRect(width: 40, height: 40, radius: RadiusToken.small)

            // Title line
            shimmerRect(height: 18, radius: 4)
                .frame(maxWidth: .infinity)
                .padding(.trailing, RallySpacing.xxxl)

            // Body lines
            shimmerRect(height: 12, radius: 4)
                .frame(maxWidth: .infinity)

            shimmerRect(height: 12, radius: 4)
                .frame(maxWidth: .infinity)
                .padding(.trailing, RallySpacing.xl)

            Spacer(minLength: RallySpacing.sm)

            // Bottom row
            HStack {
                shimmerRect(width: 80, height: 14, radius: 4)
                Spacer()
                shimmerRect(width: 60, height: 14, radius: 4)
            }
        }
        .padding(RallySpacing.md)
        .frame(minHeight: 160)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
    }

    // MARK: - Row Skeleton

    private var rowSkeleton: some View {
        HStack(spacing: RallySpacing.smMd) {
            // Image placeholder
            shimmerRect(width: 72, height: 72, radius: RadiusToken.small)

            VStack(alignment: .leading, spacing: RallySpacing.sm) {
                shimmerRect(height: 16, radius: 4)
                    .frame(maxWidth: 180)

                shimmerRect(height: 12, radius: 4)
                    .frame(maxWidth: 120)

                shimmerRect(height: 14, radius: 4)
                    .frame(maxWidth: 80)
            }

            Spacer()

            shimmerRect(width: 64, height: 32, radius: RadiusToken.button)
        }
        .padding(RallySpacing.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(RallyColors.navyMid)
        )
    }

    // MARK: - Circle Skeleton

    private func circleSkeleton(diameter: CGFloat) -> some View {
        VStack(spacing: RallySpacing.xs) {
            Circle()
                .fill(shimmerGradient)
                .frame(width: diameter, height: diameter)

            shimmerRect(width: 32, height: 10, radius: 4)
        }
    }

    // MARK: - Banner Skeleton

    private var bannerSkeleton: some View {
        ZStack(alignment: .bottomLeading) {
            shimmerRect(height: 180, radius: RadiusToken.card)
                .frame(maxWidth: .infinity)

            HStack(spacing: RallySpacing.smMd) {
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: RallySpacing.sm) {
                    shimmerRect(width: 160, height: 20, radius: 4)
                        .opacity(0.5)
                    shimmerRect(width: 100, height: 14, radius: 4)
                        .opacity(0.5)
                }
            }
            .padding(RallySpacing.md)
        }
    }

    // MARK: - Rectangle Skeleton

    private func rectangleSkeleton(width: CGFloat?, height: CGFloat) -> some View {
        shimmerRect(width: width, height: height, radius: RadiusToken.small)
            .frame(maxWidth: width == nil ? .infinity : nil)
    }

    // MARK: - Shimmer Building Blocks

    private func shimmerRect(
        width: CGFloat? = nil,
        height: CGFloat,
        radius: CGFloat = 4
    ) -> some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(shimmerGradient)
            .frame(width: width, height: height)
    }

    private var shimmerGradient: some ShapeStyle {
        LinearGradient(
            colors: [
                RallyColors.gray.opacity(0.15),
                RallyColors.gray.opacity(0.25),
                RallyColors.gray.opacity(0.15)
            ],
            startPoint: UnitPoint(x: phase - 1, y: 0.5),
            endPoint: UnitPoint(x: phase, y: 0.5)
        )
    }
}

// MARK: - Preview

#Preview("Loading Shimmers") {
    ScrollView {
        VStack(spacing: 24) {
            Text("Card Skeleton")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            LoadingShimmer(shape: .card)

            Text("Row Skeletons")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            LoadingShimmer(shape: .row, count: 3)

            Text("Circle Skeleton")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            LoadingShimmer(shape: .circle())

            Text("Banner Skeleton")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            LoadingShimmer(shape: .banner)

            Text("Custom Rectangle")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            LoadingShimmer(shape: .rectangle(height: 44))
        }
        .padding()
    }
    .background(RallyColors.navy)
}
