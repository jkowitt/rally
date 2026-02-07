import SwiftUI

/// Spacing tokens for the Rally design system based on a 4pt grid.
public enum RallySpacing {
    /// 4pt — Extra small
    public static let xs: CGFloat = 4

    /// 8pt — Small
    public static let sm: CGFloat = 8

    /// 12pt — Small-medium
    public static let smMd: CGFloat = 12

    /// 16pt — Medium
    public static let md: CGFloat = 16

    /// 20pt — Medium-large
    public static let mdLg: CGFloat = 20

    /// 24pt — Large
    public static let lg: CGFloat = 24

    /// 32pt — Extra large
    public static let xl: CGFloat = 32

    /// 40pt — 2X large
    public static let xxl: CGFloat = 40

    /// 48pt — 3X large
    public static let xxxl: CGFloat = 48
}

/// Corner radius tokens for the Rally design system.
public enum RallyRadius {
    /// 8pt — Small elements (badges, chips)
    public static let small: CGFloat = 8

    /// 12pt — Buttons
    public static let button: CGFloat = 12

    /// 16pt — Cards
    public static let card: CGFloat = 16

    /// 24pt — Large containers
    public static let large: CGFloat = 24

    /// Full circle
    public static let full: CGFloat = .infinity
}
