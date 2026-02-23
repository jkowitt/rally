package com.rally.app.core.theme

import androidx.compose.ui.graphics.Color

/**
 * Brand color constants for the Rally design system.
 *
 * These colors define the visual identity of the Rally platform
 * and serve as the foundation for both the default theme and
 * school-specific dynamic themes.
 */
object RallyColors {

    /** Rally Orange -- Primary brand color (#FF6B35) */
    val Orange = Color(0xFFFF6B35)

    /** Navy -- Primary dark background (#131B2E) */
    val Navy = Color(0xFF131B2E)

    /** Navy Mid -- Secondary dark background (#1C2842) */
    val NavyMid = Color(0xFF1C2842)

    /** Accent Blue -- Secondary accent (#2D9CDB) */
    val Blue = Color(0xFF2D9CDB)

    /** Off-White -- Light background (#F5F7FA) */
    val OffWhite = Color(0xFFF5F7FA)

    /** Medium Gray -- Secondary text (#8B95A5) */
    val Gray = Color(0xFF8B95A5)

    /** Success Green (#2ECC71) */
    val Success = Color(0xFF2ECC71)

    /** Error Red (#E84555) */
    val Error = Color(0xFFE84555)

    /** Warning Yellow (#FFC930) */
    val Warning = Color(0xFFFFC930)

    /** Pure White */
    val White = Color(0xFFFFFFFF)

    /** Pure Black */
    val Black = Color(0xFF000000)
}

/**
 * Parses a hex color string (e.g., "#FF6B35" or "FF6B35") into a Compose [Color].
 *
 * @param hex The hex color string, with or without leading '#'.
 * @return The parsed [Color], or null if the string is invalid.
 */
fun parseHexColor(hex: String): Color? {
    return try {
        val sanitized = hex.removePrefix("#")
        val colorLong = when (sanitized.length) {
            6 -> "FF$sanitized".toLong(16)
            8 -> sanitized.toLong(16)
            else -> return null
        }
        Color(colorLong)
    } catch (_: NumberFormatException) {
        null
    }
}
