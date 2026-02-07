import SwiftUI

/// Typography tokens for the Rally design system using Outfit font family.
public enum RallyTypography {
    /// Hero Title — Outfit Black 900, 36pt
    public static let heroTitle = Font.custom("Outfit-Black", size: 36, relativeTo: .largeTitle)

    /// Section Header — Outfit ExtraBold 800, 24pt
    public static let sectionHeader = Font.custom("Outfit-ExtraBold", size: 24, relativeTo: .title)

    /// Card Title — Outfit Bold 700, 18pt
    public static let cardTitle = Font.custom("Outfit-Bold", size: 18, relativeTo: .headline)

    /// Body — Outfit Regular 400, 16pt
    public static let body = Font.custom("Outfit-Regular", size: 16, relativeTo: .body)

    /// Caption — Outfit Regular 400, 12pt
    public static let caption = Font.custom("Outfit-Regular", size: 12, relativeTo: .caption)

    /// Points Display — Outfit Black 900, 28pt
    public static let pointsDisplay = Font.custom("Outfit-Black", size: 28, relativeTo: .title2)

    /// Button Label — Outfit SemiBold 600, 16pt
    public static let buttonLabel = Font.custom("Outfit-SemiBold", size: 16, relativeTo: .body)

    /// Tab Label — Outfit SemiBold 600, 10pt
    public static let tabLabel = Font.custom("Outfit-SemiBold", size: 10, relativeTo: .caption2)

    /// Subtitle — Outfit Regular 400, 14pt
    public static let subtitle = Font.custom("Outfit-Regular", size: 14, relativeTo: .subheadline)
}
