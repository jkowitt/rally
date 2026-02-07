import SwiftUI
import RallyCore

/// Primary call-to-action button with the Rally brand gradient, haptic feedback,
/// and an optional loading state.
///
/// Usage:
/// ```swift
/// RallyButton("Check In", icon: "location.fill") {
///     await checkIn()
/// }
/// ```
public struct RallyButton: View {

    // MARK: - Style

    /// Visual variants for the button.
    public enum Style {
        /// Brand gradient background with white text.
        case primary
        /// Outlined border with brand-colored text.
        case secondary
        /// Minimal text-only style.
        case ghost
    }

    /// Size variants controlling height and font.
    public enum Size {
        case small
        case medium
        case large

        var height: CGFloat {
            switch self {
            case .small: return 36
            case .medium: return 48
            case .large: return 56
            }
        }

        var font: Font {
            switch self {
            case .small: return RallyTypography.caption
            case .medium: return RallyTypography.buttonLabel
            case .large: return RallyTypography.buttonLabel
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .small: return RallySpacing.sm
            case .medium: return RallySpacing.md
            case .large: return RallySpacing.lg
            }
        }
    }

    // MARK: - Properties

    private let title: String
    private let icon: String?
    private let style: Style
    private let size: Size
    private let isFullWidth: Bool
    private let action: () -> Void

    @Binding private var isLoading: Bool
    @State private var isPressed = false

    // MARK: - Init

    /// Creates a Rally button.
    /// - Parameters:
    ///   - title: The button label text.
    ///   - icon: Optional SF Symbol name displayed before the label.
    ///   - style: Visual variant (default `.primary`).
    ///   - size: Size variant (default `.medium`).
    ///   - isFullWidth: Whether the button stretches to fill available width.
    ///   - isLoading: Binding that, when `true`, shows a spinner and disables interaction.
    ///   - action: Closure invoked on tap.
    public init(
        _ title: String,
        icon: String? = nil,
        style: Style = .primary,
        size: Size = .medium,
        isFullWidth: Bool = true,
        isLoading: Binding<Bool> = .constant(false),
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.size = size
        self.isFullWidth = isFullWidth
        self._isLoading = isLoading
        self.action = action
    }

    // MARK: - Body

    public var body: some View {
        Button {
            guard !isLoading else { return }
            triggerHaptic()
            action()
        } label: {
            HStack(spacing: RallySpacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foregroundColor)
                        .scaleEffect(size == .small ? 0.7 : 0.85)
                } else {
                    if let icon {
                        Image(systemName: icon)
                            .font(size.font)
                    }
                    Text(title)
                        .font(size.font)
                }
            }
            .padding(.horizontal, size.horizontalPadding)
            .frame(height: size.height)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .foregroundStyle(foregroundColor)
            .background(backgroundView)
            .clipShape(RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous))
            .overlay(borderOverlay)
        }
        .buttonStyle(.plain)
        .opacity(isLoading ? 0.8 : 1.0)
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: isPressed)
        .accessibilityLabel(accessibilityLabelText)
        .accessibilityAddTraits(.isButton)
        .accessibilityRemoveTraits(isLoading ? .isButton : [])
        .sensoryFeedback(.impact(weight: .medium), trigger: isPressed)
        ._onButtonGesture { pressing in
            isPressed = pressing
        } perform: {}
    }

    // MARK: - Appearance Helpers

    private var foregroundColor: Color {
        switch style {
        case .primary:
            return .white
        case .secondary:
            return RallyColors.orange
        case .ghost:
            return RallyColors.orange
        }
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            LinearGradient.rallyBrand
        case .secondary:
            Color.clear
        case .ghost:
            Color.clear
        }
    }

    @ViewBuilder
    private var borderOverlay: some View {
        switch style {
        case .secondary:
            RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                .strokeBorder(RallyColors.orange, lineWidth: 1.5)
        default:
            EmptyView()
        }
    }

    // MARK: - Haptic

    private func triggerHaptic() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }

    // MARK: - Accessibility

    private var accessibilityLabelText: String {
        if isLoading {
            return "\(title), loading"
        }
        return title
    }
}

// MARK: - Preview

#Preview("Primary Button") {
    VStack(spacing: 16) {
        RallyButton("Check In Now", icon: "location.fill") {}
        RallyButton("Loading", isLoading: .constant(true)) {}
        RallyButton("Get Reward", style: .secondary) {}
        RallyButton("View Details", style: .ghost, isFullWidth: false) {}
        RallyButton("Small", style: .primary, size: .small, isFullWidth: false) {}
        RallyButton("Large", style: .primary, size: .large) {}
    }
    .padding()
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
