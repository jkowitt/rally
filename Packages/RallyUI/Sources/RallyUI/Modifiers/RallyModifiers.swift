import SwiftUI
import RallyCore

// MARK: - Card Shadow Modifier

/// Applies the standard Rally card shadow to any view.
public struct RallyCardShadow: ViewModifier {
    public let radius: CGFloat
    public let y: CGFloat

    public init(radius: CGFloat = ShadowToken.cardRadius, y: CGFloat = ShadowToken.cardY) {
        self.radius = radius
        self.y = y
    }

    public func body(content: Content) -> some View {
        content
            .shadow(
                color: ShadowToken.cardColor,
                radius: radius,
                x: ShadowToken.cardX,
                y: y
            )
    }
}

// MARK: - Elevated Shadow Modifier

/// Applies an elevated shadow for floating elements like modals and FABs.
public struct RallyElevatedShadow: ViewModifier {
    public func body(content: Content) -> some View {
        content
            .shadow(
                color: ShadowToken.elevatedColor,
                radius: ShadowToken.elevatedRadius,
                x: ShadowToken.elevatedX,
                y: ShadowToken.elevatedY
            )
    }
}

// MARK: - Theme Foreground Modifier

/// Applies school-themed primary color as the foreground style.
public struct ThemedForeground: ViewModifier {
    @Environment(ThemeEngine.self) private var themeEngine

    public func body(content: Content) -> some View {
        content
            .foregroundStyle(themeEngine.activeTheme.primaryColor)
    }
}

// MARK: - Themed Background Modifier

/// Applies the school-themed background color.
public struct ThemedBackground: ViewModifier {
    @Environment(ThemeEngine.self) private var themeEngine
    let cornerRadius: CGFloat

    public init(cornerRadius: CGFloat = 0) {
        self.cornerRadius = cornerRadius
    }

    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(themeEngine.activeTheme.backgroundColor)
            )
    }
}

// MARK: - Rally Card Style Modifier

/// Applies a complete Rally card style with background, corner radius, and shadow.
public struct RallyCardStyle: ViewModifier {
    public enum Style {
        case light
        case dark
        case branded
    }

    @Environment(ThemeEngine.self) private var themeEngine
    let style: Style

    public init(style: Style = .dark) {
        self.style = style
    }

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

    public func body(content: Content) -> some View {
        content
            .padding(SpacingToken.md)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(backgroundColor)
            )
            .modifier(RallyCardShadow())
    }
}

// MARK: - Shimmer Effect Modifier

/// Adds a shimmer animation overlay, typically used for loading states.
public struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0

    public func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            .clear,
                            Color.white.opacity(0.2),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 0.6)
                    .offset(x: -geometry.size.width * 0.3 + phase * (geometry.size.width * 1.6))
                    .clipped()
                }
            )
            .onAppear {
                withAnimation(
                    .linear(duration: 1.5)
                    .repeatForever(autoreverses: false)
                ) {
                    phase = 1
                }
            }
    }
}

// MARK: - View Extensions

public extension View {
    /// Applies the standard Rally card shadow.
    func rallyCardShadow(
        radius: CGFloat = ShadowToken.cardRadius,
        y: CGFloat = ShadowToken.cardY
    ) -> some View {
        modifier(RallyCardShadow(radius: radius, y: y))
    }

    /// Applies an elevated shadow for floating elements.
    func rallyElevatedShadow() -> some View {
        modifier(RallyElevatedShadow())
    }

    /// Applies the school-themed primary color as foreground.
    func themedForeground() -> some View {
        modifier(ThemedForeground())
    }

    /// Applies the school-themed background color.
    func themedBackground(cornerRadius: CGFloat = 0) -> some View {
        modifier(ThemedBackground(cornerRadius: cornerRadius))
    }

    /// Applies a complete Rally card style.
    func rallyCardStyle(_ style: RallyCardStyle.Style = .dark) -> some View {
        modifier(RallyCardStyle(style: style))
    }

    /// Applies a shimmer animation overlay.
    func shimmer() -> some View {
        modifier(ShimmerEffect())
    }
}
