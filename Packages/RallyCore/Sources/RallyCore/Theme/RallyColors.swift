import SwiftUI

/// Brand color constants for the Rally design system.
public enum RallyColors {
    /// Rally Orange — Primary brand color (#FF6B35)
    public static let orange = Color(red: 1.0, green: 0.42, blue: 0.21)

    /// Navy — Primary dark background (#131B2E)
    public static let navy = Color(red: 0.075, green: 0.106, blue: 0.18)

    /// Navy Mid — Secondary dark background (#1C2842)
    public static let navyMid = Color(red: 0.11, green: 0.157, blue: 0.259)

    /// Accent Blue — Secondary accent (#2D9CDB)
    public static let blue = Color(red: 0.176, green: 0.612, blue: 0.859)

    /// Off-White — Light background (#F5F7FA)
    public static let offWhite = Color(red: 0.961, green: 0.969, blue: 0.98)

    /// Medium Gray — Secondary text (#8B95A5)
    public static let gray = Color(red: 0.545, green: 0.584, blue: 0.647)

    /// Success Green
    public static let success = Color(red: 0.18, green: 0.8, blue: 0.44)

    /// Error Red
    public static let error = Color(red: 0.91, green: 0.27, blue: 0.33)

    /// Warning Yellow
    public static let warning = Color(red: 1.0, green: 0.79, blue: 0.19)
}

/// Color extension for theme-based access.
public extension Color {
    static let rally = RallyColorNamespace()
}

public struct RallyColorNamespace {
    public let orange = RallyColors.orange
    public let navy = RallyColors.navy
    public let navyMid = RallyColors.navyMid
    public let blue = RallyColors.blue
    public let offWhite = RallyColors.offWhite
    public let gray = RallyColors.gray
    public let success = RallyColors.success
    public let error = RallyColors.error
    public let warning = RallyColors.warning
}
