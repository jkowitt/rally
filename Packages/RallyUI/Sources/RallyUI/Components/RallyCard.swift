import SwiftUI
import RallyCore

/// Elevated container with rounded corners and shadow, available in light, dark,
/// or branded style variants.
///
/// Usage:
/// ```swift
/// RallyCard(style: .dark) {
///     Text("Card Content")
/// }
/// ```
public struct RallyCard<Content: View>: View {

    // MARK: - Style

    /// Visual style variants for the card.
    public enum Style {
        /// Light background using off-white.
        case light
        /// Dark background using navy mid.
        case dark
        /// Tinted background derived from the active school theme.
        case branded
    }

    // MARK: - Properties

    @Environment(ThemeEngine.self) private var themeEngine

    private let style: Style
    private let padding: CGFloat
    private let content: () -> Content

    // MARK: - Init

    /// Creates a Rally card.
    /// - Parameters:
    ///   - style: The visual variant (default `.dark`).
    ///   - padding: Inner padding applied to the content (default `RallySpacing.md`).
    ///   - content: The view builder for the card's content.
    public init(
        style: Style = .dark,
        padding: CGFloat = RallySpacing.md,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.style = style
        self.padding = padding
        self.content = content
    }

    // MARK: - Body

    public var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(backgroundColor)
            )
            .shadow(
                color: shadowColor,
                radius: ShadowToken.cardRadius,
                x: ShadowToken.cardX,
                y: ShadowToken.cardY
            )
            .accessibilityElement(children: .contain)
    }

    // MARK: - Appearance Helpers

    private var backgroundColor: Color {
        switch style {
        case .light:
            return RallyColors.offWhite
        case .dark:
            return RallyColors.navyMid
        case .branded:
            return themeEngine.activeTheme.primaryColor.opacity(0.12)
        }
    }

    private var shadowColor: Color {
        switch style {
        case .light:
            return ShadowToken.cardColor
        case .dark:
            return Color.black.opacity(0.12)
        case .branded:
            return themeEngine.activeTheme.primaryColor.opacity(0.1)
        }
    }
}

// MARK: - Preview

#Preview("Card Styles") {
    ScrollView {
        VStack(spacing: 16) {
            RallyCard(style: .dark) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Dark Card")
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(.white)
                    Text("Elevated container with navy mid background.")
                        .font(RallyTypography.body)
                        .foregroundStyle(RallyColors.gray)
                }
            }

            RallyCard(style: .light) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Light Card")
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(RallyColors.navy)
                    Text("Off-white background for lighter contexts.")
                        .font(RallyTypography.body)
                        .foregroundStyle(RallyColors.gray)
                }
            }

            RallyCard(style: .branded) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Branded Card")
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(.white)
                    Text("Tinted with the active school theme color.")
                        .font(RallyTypography.body)
                        .foregroundStyle(RallyColors.gray)
                }
            }
        }
        .padding()
    }
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
