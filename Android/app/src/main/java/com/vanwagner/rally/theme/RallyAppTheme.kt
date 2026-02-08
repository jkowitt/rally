package com.vanwagner.rally.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.vanwagner.rally.core.theme.RallyColors

private val RallyDarkColorScheme = darkColorScheme(
    primary = RallyColors.Orange,
    onPrimary = Color.White,
    primaryContainer = RallyColors.Orange,
    secondary = RallyColors.Blue,
    onSecondary = Color.White,
    background = RallyColors.Navy,
    onBackground = Color.White,
    surface = RallyColors.NavyMid,
    onSurface = Color.White,
    surfaceVariant = RallyColors.NavyMid,
    onSurfaceVariant = RallyColors.Gray,
    error = RallyColors.Error,
    onError = Color.White,
    outline = RallyColors.Gray,
)

@Composable
fun RallyAppTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = RallyDarkColorScheme,
        content = content
    )
}
