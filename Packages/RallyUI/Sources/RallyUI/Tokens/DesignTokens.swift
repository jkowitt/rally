import SwiftUI
@_exported import RallyCore

// MARK: - Design Tokens

/// Centralized re-exports and convenience accessors for Rally design tokens.
/// Import `RallyUI` to get full access to colors, typography, spacing, and radii
/// defined in RallyCore.

// MARK: - Color Tokens

/// Namespace for Rally brand color tokens, re-exported for convenience.
public enum ColorToken {
    /// Rally Orange — Primary brand CTA color (#FF6B35)
    public static let orange = RallyColors.orange
    /// Navy — Primary dark background (#131B2E)
    public static let navy = RallyColors.navy
    /// Navy Mid — Elevated card surface (#1C2842)
    public static let navyMid = RallyColors.navyMid
    /// Accent Blue — Links and secondary actions (#2D9CDB)
    public static let accentBlue = RallyColors.blue
    /// Off-White — Light background (#F5F7FA)
    public static let offWhite = RallyColors.offWhite
    /// Medium Gray — Secondary text and borders (#8B95A5)
    public static let mediumGray = RallyColors.gray
    /// Success Green
    public static let success = RallyColors.success
    /// Error Red
    public static let error = RallyColors.error
    /// Warning Yellow
    public static let warning = RallyColors.warning
}

// MARK: - Typography Tokens

/// Namespace for Rally typography tokens, re-exported for convenience.
public enum TypographyToken {
    /// Outfit Black 900, 36pt — Hero titles
    public static let heroTitle = RallyTypography.heroTitle
    /// Outfit ExtraBold 800, 24pt — Section headers
    public static let sectionHeader = RallyTypography.sectionHeader
    /// Outfit Bold 700, 18pt — Card titles
    public static let cardTitle = RallyTypography.cardTitle
    /// Outfit Regular 400, 16pt — Body text
    public static let body = RallyTypography.body
    /// Outfit Regular 400, 12pt — Captions
    public static let caption = RallyTypography.caption
    /// Outfit Black 900, 28pt — Points display
    public static let pointsDisplay = RallyTypography.pointsDisplay
    /// Outfit SemiBold 600, 16pt — Button labels
    public static let buttonLabel = RallyTypography.buttonLabel
    /// Outfit Regular 400, 14pt — Subtitles
    public static let subtitle = RallyTypography.subtitle
}

// MARK: - Spacing Tokens

/// Namespace for Rally spacing tokens (4pt base grid), re-exported for convenience.
public enum SpacingToken {
    /// 4pt — Extra small
    public static let xs = RallySpacing.xs
    /// 8pt — Small
    public static let sm = RallySpacing.sm
    /// 12pt — Small-medium
    public static let smMd = RallySpacing.smMd
    /// 16pt — Medium
    public static let md = RallySpacing.md
    /// 20pt — Medium-large
    public static let mdLg = RallySpacing.mdLg
    /// 24pt — Large
    public static let lg = RallySpacing.lg
    /// 32pt — Extra large
    public static let xl = RallySpacing.xl
    /// 40pt — 2X large
    public static let xxl = RallySpacing.xxl
    /// 48pt — 3X large
    public static let xxxl = RallySpacing.xxxl
}

// MARK: - Radius Tokens

/// Namespace for Rally corner radius tokens, re-exported for convenience.
public enum RadiusToken {
    /// 8pt — Small elements (badges, chips)
    public static let small = RallyRadius.small
    /// 12pt — Buttons
    public static let button = RallyRadius.button
    /// 16pt — Cards
    public static let card = RallyRadius.card
    /// 24pt — Large containers
    public static let large = RallyRadius.large
    /// Full circle
    public static let full = RallyRadius.full
}

// MARK: - Shadow Tokens

/// Standard shadow configurations for the Rally design system.
public enum ShadowToken {
    /// Card shadow: 0 4 16 rgba(0,0,0,0.08)
    public static let cardColor = Color.black.opacity(0.08)
    public static let cardRadius: CGFloat = 16
    public static let cardX: CGFloat = 0
    public static let cardY: CGFloat = 4

    /// Elevated shadow for floating elements
    public static let elevatedColor = Color.black.opacity(0.16)
    public static let elevatedRadius: CGFloat = 24
    public static let elevatedX: CGFloat = 0
    public static let elevatedY: CGFloat = 8
}

// MARK: - Brand Gradient

/// The primary brand gradient used on CTAs and branded surfaces.
public extension LinearGradient {
    /// Rally brand gradient: orange to a slightly warmer orange-red.
    static let rallyBrand = LinearGradient(
        colors: [RallyColors.orange, Color(red: 1.0, green: 0.38, blue: 0.15)],
        startPoint: .leading,
        endPoint: .trailing
    )
}

// MARK: - Tier Color Mapping

public extension Tier {
    /// The accent color associated with this loyalty tier.
    var color: Color {
        switch self {
        case .rookie:
            return RallyColors.gray
        case .starter:
            return RallyColors.blue
        case .allStar:
            return RallyColors.orange
        case .mvp:
            return Color(red: 0.85, green: 0.65, blue: 0.13) // Gold
        case .hallOfFame:
            return Color(red: 0.76, green: 0.57, blue: 0.87) // Purple
        }
    }
}
