import SwiftUI
import RallyCore

/// Animated points counter badge with a tier-colored accent ring.
///
/// The displayed value animates numerically when `points` changes, and the accent
/// ring color is derived from the user's current `Tier`.
///
/// Usage:
/// ```swift
/// PointsBadge(points: 1250, tier: .allStar)
/// ```
public struct PointsBadge: View {

    // MARK: - Size

    /// Size variants for the badge.
    public enum Size {
        case compact
        case regular
        case large

        var diameter: CGFloat {
            switch self {
            case .compact: return 48
            case .regular: return 72
            case .large: return 96
            }
        }

        var font: Font {
            switch self {
            case .compact: return RallyTypography.buttonLabel
            case .regular: return RallyTypography.pointsDisplay
            case .large: return RallyTypography.heroTitle
            }
        }

        var ringWidth: CGFloat {
            switch self {
            case .compact: return 2
            case .regular: return 3
            case .large: return 4
            }
        }
    }

    // MARK: - Properties

    private let points: Int
    private let tier: Tier
    private let size: Size
    private let showLabel: Bool

    @State private var displayedPoints: Int = 0
    @State private var animationProgress: CGFloat = 0

    // MARK: - Init

    /// Creates a points badge.
    /// - Parameters:
    ///   - points: The current point balance to display.
    ///   - tier: The user's loyalty tier, used for the accent ring color.
    ///   - size: Badge size variant (default `.regular`).
    ///   - showLabel: Whether to show "pts" label beneath the number.
    public init(
        points: Int,
        tier: Tier,
        size: Size = .regular,
        showLabel: Bool = true
    ) {
        self.points = points
        self.tier = tier
        self.size = size
        self.showLabel = showLabel
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: RallySpacing.xs) {
            ZStack {
                // Tier accent ring
                Circle()
                    .strokeBorder(
                        AngularGradient(
                            colors: [tier.color, tier.color.opacity(0.4), tier.color],
                            center: .center
                        ),
                        lineWidth: size.ringWidth
                    )
                    .frame(width: size.diameter, height: size.diameter)
                    .rotationEffect(.degrees(-90))

                // Points number with animated counting
                Text("\(displayedPoints)")
                    .font(size.font)
                    .fontDesign(.rounded)
                    .foregroundStyle(.white)
                    .contentTransition(.numericText(value: Double(displayedPoints)))
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .padding(.horizontal, RallySpacing.xs)
            }
            .frame(width: size.diameter, height: size.diameter)

            if showLabel && size != .compact {
                Text("pts")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                    .textCase(.uppercase)
            }
        }
        .onAppear {
            animatePoints(to: points)
        }
        .onChange(of: points) { _, newValue in
            animatePoints(to: newValue)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(points) points, \(tier.rawValue) tier")
        .accessibilityValue("\(points)")
    }

    // MARK: - Animation

    private func animatePoints(to target: Int) {
        let start = displayedPoints
        let delta = target - start
        guard delta != 0 else { return }

        let steps = min(abs(delta), 30)
        let duration: TimeInterval = 0.6

        for step in 0...steps {
            let delay = duration * Double(step) / Double(steps)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                withAnimation(.easeOut(duration: 0.05)) {
                    displayedPoints = start + (delta * step) / steps
                }
            }
        }

        // Ensure final value is exact
        DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.05) {
            withAnimation(.easeOut(duration: 0.05)) {
                displayedPoints = target
            }
        }
    }
}

// MARK: - Preview

#Preview("Points Badge") {
    HStack(spacing: 24) {
        PointsBadge(points: 250, tier: .rookie, size: .compact, showLabel: false)
        PointsBadge(points: 1250, tier: .allStar)
        PointsBadge(points: 15820, tier: .hallOfFame, size: .large)
    }
    .padding()
    .background(RallyColors.navy)
}
