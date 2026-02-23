package com.vanwagner.rally.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ---------------------------------------------------------------------------
// Rally Design Tokens – Android
// Mirrors the iOS RallyUI design-token definitions for spacing, radii, colors,
// typography, and shadows so that both platforms share a single visual language.
// ---------------------------------------------------------------------------

// MARK: - Color Tokens

object RallyColors {
    /** Rally Orange -- Primary brand CTA color (#FF6B35) */
    val Orange = Color(0xFFFF6B35)

    /** Navy -- Primary dark background (#131B2E) */
    val Navy = Color(0xFF131B2E)

    /** Navy Mid -- Elevated card surface (#1C2842) */
    val NavyMid = Color(0xFF1C2842)

    /** Accent Blue -- Links and secondary actions (#2D9CDB) */
    val Blue = Color(0xFF2D9CDB)

    /** Off-White -- Light background (#F5F7FA) */
    val OffWhite = Color(0xFFF5F7FA)

    /** Medium Gray -- Secondary text and borders (#8B95A5) */
    val Gray = Color(0xFF8B95A5)

    /** Success Green */
    val Success = Color(0xFF34C759)

    /** Error Red */
    val Error = Color(0xFFFF3B30)

    /** Warning Yellow */
    val Warning = Color(0xFFFFCC00)

    /** Gold -- MVP tier accent */
    val Gold = Color(0xFFD9A621)

    /** Purple -- Hall of Fame tier accent */
    val Purple = Color(0xFFC291DE)
}

// MARK: - Brand Gradient

object RallyGradients {
    /** Primary brand gradient: orange to a warmer orange-red, left-to-right. */
    val Brand = Brush.horizontalGradient(
        colors = listOf(RallyColors.Orange, Color(0xFFFF6126))
    )
}

// MARK: - Spacing Tokens (4dp base grid)

object RallySpacing {
    /** 4dp -- Extra small */
    val xs: Dp = 4.dp

    /** 8dp -- Small */
    val sm: Dp = 8.dp

    /** 12dp -- Small-medium */
    val smMd: Dp = 12.dp

    /** 16dp -- Medium */
    val md: Dp = 16.dp

    /** 20dp -- Medium-large */
    val mdLg: Dp = 20.dp

    /** 24dp -- Large */
    val lg: Dp = 24.dp

    /** 32dp -- Extra large */
    val xl: Dp = 32.dp

    /** 40dp -- 2X large */
    val xxl: Dp = 40.dp

    /** 48dp -- 3X large */
    val xxxl: Dp = 48.dp
}

// MARK: - Radius Tokens

object RallyRadius {
    /** 8dp -- Small elements (badges, chips) */
    val small: Dp = 8.dp

    /** 12dp -- Buttons */
    val button: Dp = 12.dp

    /** 16dp -- Cards */
    val card: Dp = 16.dp

    /** 24dp -- Large containers */
    val large: Dp = 24.dp

    /** Full circle -- use a very large value; Compose clips automatically */
    val full: Dp = 1000.dp
}

// MARK: - Shadow Tokens

object RallyShadow {
    /** Card shadow elevation */
    val cardElevation: Dp = 4.dp

    /** Elevated shadow for floating elements */
    val elevatedElevation: Dp = 8.dp

    /** Card shadow color */
    val cardColor = Color.Black.copy(alpha = 0.08f)

    /** Elevated shadow color */
    val elevatedColor = Color.Black.copy(alpha = 0.16f)
}

// MARK: - Outfit Font Family

val OutfitFontFamily = FontFamily.Default

// MARK: - Typography Tokens

object RallyTypography {
    /** Outfit Black 900, 36sp -- Hero titles */
    val heroTitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Black,
        fontSize = 36.sp,
        lineHeight = 40.sp,
    )

    /** Outfit ExtraBold 800, 24sp -- Section headers */
    val sectionHeader = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
    )

    /** Outfit Bold 700, 18sp -- Card titles */
    val cardTitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
    )

    /** Outfit Regular 400, 16sp -- Body text */
    val body = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    )

    /** Outfit SemiBold 600, 16sp -- Button labels */
    val buttonLabel = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    )

    /** Outfit Regular 400, 14sp -- Subtitles */
    val subtitle = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    )

    /** Outfit Regular 400, 12sp -- Captions */
    val caption = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    )

    /** Outfit Black 900, 28sp -- Points display */
    val pointsDisplay = TextStyle(
        fontFamily = OutfitFontFamily,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 34.sp,
    )
}

// MARK: - Tier Color Mapping

/**
 * Returns the accent [Color] associated with the given tier name.
 * Tier names follow the iOS model: "Rookie", "Starter", "All-Star", "MVP", "Hall of Fame".
 */
fun tierColor(tier: String): Color = when (tier.lowercase()) {
    "rookie"       -> RallyColors.Gray
    "starter"      -> RallyColors.Blue
    "all-star"     -> RallyColors.Orange
    "mvp"          -> RallyColors.Gold
    "hall of fame" -> RallyColors.Purple
    else           -> RallyColors.Gray
}
