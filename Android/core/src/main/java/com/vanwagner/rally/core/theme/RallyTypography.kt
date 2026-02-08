package com.vanwagner.rally.core.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Outfit font family for the Rally design system.
 *
 * Uses the system default sans-serif as a fallback when the Outfit font
 * files are not bundled. In production, add Outfit font files to
 * res/font/ and update this definition to reference them.
 */
val OutfitFontFamily = FontFamily.Default

/**
 * Rally typography tokens mirroring the iOS design system.
 *
 * Font weights map to Outfit variants:
 * - Black (900): heroTitle, pointsDisplay
 * - ExtraBold (800): sectionHeader
 * - Bold (700): cardTitle
 * - SemiBold (600): buttonLabel, tabLabel
 * - Regular (400): body, caption, subtitle
 */
object RallyType {

    /** Hero Title -- Outfit Black 900, 36sp */
    val heroTitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Black,
        fontSize = 36.sp,
        lineHeight = 42.sp
    )

    /** Section Header -- Outfit ExtraBold 800, 24sp */
    val sectionHeader = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    )

    /** Card Title -- Outfit Bold 700, 18sp */
    val cardTitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    )

    /** Body -- Outfit Regular 400, 16sp */
    val body = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp
    )

    /** Caption -- Outfit Regular 400, 12sp */
    val caption = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )

    /** Points Display -- Outfit Black 900, 28sp */
    val pointsDisplay = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 34.sp
    )

    /** Button Label -- Outfit SemiBold 600, 16sp */
    val buttonLabel = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    )

    /** Tab Label -- Outfit SemiBold 600, 10sp */
    val tabLabel = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 10.sp,
        lineHeight = 14.sp
    )

    /** Subtitle -- Outfit Regular 400, 14sp */
    val subtitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    )
}

/**
 * Material 3 typography configured with Outfit-based Rally type tokens.
 */
val RallyTypography = Typography(
    displayLarge = RallyType.heroTitle,
    displayMedium = RallyType.sectionHeader,
    headlineLarge = RallyType.sectionHeader,
    headlineMedium = RallyType.cardTitle,
    titleLarge = RallyType.cardTitle,
    titleMedium = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleSmall = RallyType.subtitle,
    bodyLarge = RallyType.body,
    bodyMedium = RallyType.subtitle,
    bodySmall = RallyType.caption,
    labelLarge = RallyType.buttonLabel,
    labelMedium = RallyType.tabLabel,
    labelSmall = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 14.sp
    )
)
