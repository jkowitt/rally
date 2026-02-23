package com.rally.app.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.rally.app.core.model.SchoolTheme

// ---------------------------------------------------------------------------
// Rally extended color scheme (school-specific theming beyond Material3)
// ---------------------------------------------------------------------------

/**
 * Resolved theme values used throughout the app, supporting school-specific
 * dynamic theming. This mirrors the iOS ThemeEngine's RallyTheme struct.
 */
@Immutable
data class RallyColorScheme(
    val primary: Color = RallyColors.Orange,
    val secondary: Color = RallyColors.Navy,
    val accent: Color = RallyColors.Blue,
    val background: Color = RallyColors.Navy,
    val surface: Color = RallyColors.NavyMid,
    val onPrimary: Color = RallyColors.White,
    val onBackground: Color = RallyColors.OffWhite,
    val success: Color = RallyColors.Success,
    val error: Color = RallyColors.Error,
    val warning: Color = RallyColors.Warning,
    val textPrimary: Color = RallyColors.White,
    val textSecondary: Color = RallyColors.Gray,
    val divider: Color = RallyColors.NavyMid
) {
    companion object {
        /** Default Rally brand theme (no school override). */
        val Default = RallyColorScheme()

        /**
         * Creates a [RallyColorScheme] from a school's theme configuration.
         */
        fun fromSchoolTheme(schoolTheme: SchoolTheme): RallyColorScheme {
            val primary = parseHexColor(schoolTheme.primaryColor) ?: RallyColors.Orange
            val secondary = parseHexColor(schoolTheme.secondaryColor) ?: RallyColors.Navy
            val accent = parseHexColor(schoolTheme.accentColor) ?: RallyColors.Blue
            val bg = schoolTheme.darkModeBackground?.let { parseHexColor(it) } ?: RallyColors.Navy

            return RallyColorScheme(
                primary = primary,
                secondary = secondary,
                accent = accent,
                background = bg
            )
        }
    }
}

/**
 * CompositionLocal for accessing the current [RallyColorScheme] throughout
 * the composable tree. Provides school-specific colors when a school theme
 * is active, or the default Rally brand colors otherwise.
 */
val LocalRallyColors = staticCompositionLocalOf { RallyColorScheme.Default }

// ---------------------------------------------------------------------------
// Material3 color schemes
// ---------------------------------------------------------------------------

private val RallyDarkColorScheme = darkColorScheme(
    primary = RallyColors.Orange,
    onPrimary = RallyColors.White,
    primaryContainer = RallyColors.Orange.copy(alpha = 0.2f),
    onPrimaryContainer = RallyColors.Orange,
    secondary = RallyColors.Blue,
    onSecondary = RallyColors.White,
    secondaryContainer = RallyColors.Blue.copy(alpha = 0.2f),
    onSecondaryContainer = RallyColors.Blue,
    tertiary = RallyColors.Warning,
    background = RallyColors.Navy,
    onBackground = RallyColors.OffWhite,
    surface = RallyColors.NavyMid,
    onSurface = RallyColors.OffWhite,
    surfaceVariant = RallyColors.NavyMid,
    onSurfaceVariant = RallyColors.Gray,
    error = RallyColors.Error,
    onError = RallyColors.White,
    outline = RallyColors.Gray
)

private val RallyLightColorScheme = lightColorScheme(
    primary = RallyColors.Orange,
    onPrimary = RallyColors.White,
    primaryContainer = RallyColors.Orange.copy(alpha = 0.1f),
    onPrimaryContainer = RallyColors.Orange,
    secondary = RallyColors.Blue,
    onSecondary = RallyColors.White,
    secondaryContainer = RallyColors.Blue.copy(alpha = 0.1f),
    onSecondaryContainer = RallyColors.Blue,
    tertiary = RallyColors.Warning,
    background = RallyColors.OffWhite,
    onBackground = RallyColors.Navy,
    surface = RallyColors.White,
    onSurface = RallyColors.Navy,
    surfaceVariant = RallyColors.OffWhite,
    onSurfaceVariant = RallyColors.Gray,
    error = RallyColors.Error,
    onError = RallyColors.White,
    outline = RallyColors.Gray
)

// ---------------------------------------------------------------------------
// Theme composable
// ---------------------------------------------------------------------------

/**
 * Rally Material 3 theme with support for dynamic school-based theming.
 *
 * This is the Android equivalent of the iOS ThemeEngine. It wraps
 * [MaterialTheme] with Rally-specific color schemes and provides
 * [LocalRallyColors] for accessing the extended color palette.
 *
 * @param schoolTheme Optional school theme to override default brand colors.
 * @param darkTheme Whether to use the dark color scheme. Defaults to system setting.
 * @param content The composable content to render within the theme.
 */
@Composable
fun RallyTheme(
    schoolTheme: SchoolTheme? = null,
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val rallyColors = if (schoolTheme != null) {
        RallyColorScheme.fromSchoolTheme(schoolTheme)
    } else {
        RallyColorScheme.Default
    }

    val materialColorScheme: ColorScheme = if (darkTheme) {
        if (schoolTheme != null) {
            RallyDarkColorScheme.copy(
                primary = rallyColors.primary,
                secondary = rallyColors.accent,
                background = rallyColors.background,
                surface = rallyColors.surface
            )
        } else {
            RallyDarkColorScheme
        }
    } else {
        if (schoolTheme != null) {
            RallyLightColorScheme.copy(
                primary = rallyColors.primary,
                secondary = rallyColors.accent
            )
        } else {
            RallyLightColorScheme
        }
    }

    CompositionLocalProvider(LocalRallyColors provides rallyColors) {
        MaterialTheme(
            colorScheme = materialColorScheme,
            typography = RallyTypography,
            content = content
        )
    }
}

/**
 * Convenience accessor for the current [RallyColorScheme] within a composable.
 *
 * Usage:
 * ```
 * val colors = RallyTheme.colors
 * Text(color = colors.primary, text = "Hello")
 * ```
 */
object RallyTheme {
    val colors: RallyColorScheme
        @Composable
        get() = LocalRallyColors.current
}
