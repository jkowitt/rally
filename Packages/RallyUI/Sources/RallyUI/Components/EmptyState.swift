import SwiftUI
import RallyCore

/// Empty state placeholder view with an illustration, message, and optional
/// call-to-action button.
///
/// Usage:
/// ```swift
/// EmptyState(
///     icon: "calendar.badge.exclamationmark",
///     title: "No Upcoming Events",
///     message: "Check back soon for the next gameday.",
///     actionTitle: "Browse Schools"
/// ) {
///     navigateToSchools()
/// }
/// ```
public struct EmptyState: View {

    // MARK: - Properties

    private let icon: String
    private let title: String
    private let message: String
    private let actionTitle: String?
    private let action: (() -> Void)?

    // MARK: - Init

    /// Creates an empty state view.
    /// - Parameters:
    ///   - icon: SF Symbol name for the illustration.
    ///   - title: Primary heading text.
    ///   - message: Descriptive body text explaining why this state is shown.
    ///   - actionTitle: Optional button label. If `nil`, no button is shown.
    ///   - action: Closure invoked when the optional CTA button is tapped.
    public init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: RallySpacing.md) {
            Spacer()

            // Illustration icon
            Image(systemName: icon)
                .font(.system(size: 56, weight: .light))
                .foregroundStyle(
                    LinearGradient(
                        colors: [RallyColors.gray.opacity(0.6), RallyColors.gray.opacity(0.3)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .padding(.bottom, RallySpacing.sm)
                .accessibilityHidden(true)

            // Title
            Text(title)
                .font(RallyTypography.sectionHeader)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            // Message
            Text(message)
                .font(RallyTypography.body)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)

            // Optional CTA
            if let actionTitle, let action {
                RallyButton(
                    actionTitle,
                    style: .secondary,
                    size: .medium,
                    isFullWidth: false
                ) {
                    action()
                }
                .padding(.top, RallySpacing.sm)
            }

            Spacer()
        }
        .padding(.horizontal, RallySpacing.xl)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
    }
}

// MARK: - Convenience Initializers

public extension EmptyState {
    /// Empty state for no events.
    static func noEvents(action: (() -> Void)? = nil) -> EmptyState {
        EmptyState(
            icon: "calendar.badge.exclamationmark",
            title: "No Upcoming Events",
            message: "There are no events scheduled right now. Check back soon for the next gameday!",
            actionTitle: action != nil ? "Refresh" : nil,
            action: action
        )
    }

    /// Empty state for no rewards.
    static func noRewards(action: (() -> Void)? = nil) -> EmptyState {
        EmptyState(
            icon: "gift",
            title: "No Rewards Available",
            message: "New rewards are added regularly. Keep earning points and check back soon!",
            actionTitle: action != nil ? "Browse Events" : nil,
            action: action
        )
    }

    /// Empty state for an empty leaderboard.
    static func noLeaderboard() -> EmptyState {
        EmptyState(
            icon: "trophy",
            title: "Leaderboard Coming Soon",
            message: "Complete activations during the event to see your ranking here."
        )
    }

    /// Empty state for network errors.
    static func networkError(action: (() -> Void)? = nil) -> EmptyState {
        EmptyState(
            icon: "wifi.slash",
            title: "Connection Issue",
            message: "We could not load this content. Please check your connection and try again.",
            actionTitle: "Try Again",
            action: action
        )
    }
}

// MARK: - Preview

#Preview("Empty States") {
    ScrollView {
        VStack(spacing: 48) {
            EmptyState(
                icon: "calendar.badge.exclamationmark",
                title: "No Upcoming Events",
                message: "There are no events scheduled right now. Check back soon!",
                actionTitle: "Browse Schools"
            ) {}

            Divider().background(RallyColors.gray.opacity(0.3))

            EmptyState.networkError {}

            Divider().background(RallyColors.gray.opacity(0.3))

            EmptyState.noLeaderboard()
        }
    }
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
