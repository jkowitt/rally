import SwiftUI

/// Manages dynamic theming based on the selected school.
@MainActor
@Observable
public final class ThemeEngine {
    public private(set) var currentSchool: School?
    public private(set) var activeTheme: RallyTheme

    public init() {
        self.activeTheme = .default
    }

    public func applySchool(_ school: School) {
        self.currentSchool = school
        self.activeTheme = RallyTheme(from: school.theme)
    }

    public func resetToDefault() {
        self.currentSchool = nil
        self.activeTheme = .default
    }
}

/// Resolved theme values used throughout the app.
public struct RallyTheme: Sendable {
    public let primaryColor: Color
    public let secondaryColor: Color
    public let accentColor: Color
    public let backgroundColor: Color

    public init(
        primaryColor: Color,
        secondaryColor: Color,
        accentColor: Color,
        backgroundColor: Color
    ) {
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.accentColor = accentColor
        self.backgroundColor = backgroundColor
    }

    public init(from theme: SchoolTheme) {
        self.primaryColor = Color(hex: theme.primaryColor) ?? RallyColors.orange
        self.secondaryColor = Color(hex: theme.secondaryColor) ?? RallyColors.navy
        self.accentColor = Color(hex: theme.accentColor) ?? RallyColors.blue
        self.backgroundColor = theme.darkModeBackground.flatMap { Color(hex: $0) } ?? RallyColors.navy
    }

    public static let `default` = RallyTheme(
        primaryColor: RallyColors.orange,
        secondaryColor: RallyColors.navy,
        accentColor: RallyColors.blue,
        backgroundColor: RallyColors.navy
    )
}
