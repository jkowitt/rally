package com.rally.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallyRadius
import com.rally.app.ui.theme.RallyShadow
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography

// ---------------------------------------------------------------------------
// RallyCard
// Elevated container with 16dp rounded corners and shadow.
// Styles: Light (off-white), Dark (navy mid), Branded (school primary tinted).
// ---------------------------------------------------------------------------

/** Visual style variants for the card. */
enum class RallyCardStyle {
    /** Light background using off-white. */
    Light,
    /** Dark background using navy mid. */
    Dark,
    /** Tinted background derived from the active school theme. */
    Branded,
}

/**
 * Rally design-system card.
 *
 * @param modifier       Optional [Modifier].
 * @param style          Visual variant (default [RallyCardStyle.Dark]).
 * @param contentPadding Inner padding applied to the content (default [RallySpacing.md]).
 * @param brandColor     The school primary color, used only when [style] is [RallyCardStyle.Branded].
 * @param content        Composable content slot.
 */
@Composable
fun RallyCard(
    modifier: Modifier = Modifier,
    style: RallyCardStyle = RallyCardStyle.Dark,
    contentPadding: Dp = RallySpacing.md,
    brandColor: Color = RallyColors.Orange,
    content: @Composable () -> Unit,
) {
    val backgroundColor = when (style) {
        RallyCardStyle.Light   -> RallyColors.OffWhite
        RallyCardStyle.Dark    -> RallyColors.NavyMid
        RallyCardStyle.Branded -> brandColor.copy(alpha = 0.12f)
    }
    val shadowElevation = when (style) {
        RallyCardStyle.Light -> RallyShadow.cardElevation
        RallyCardStyle.Dark  -> RallyShadow.cardElevation
        RallyCardStyle.Branded -> RallyShadow.cardElevation
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(RallyRadius.card),
        color = backgroundColor,
        shadowElevation = shadowElevation,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(contentPadding),
            contentAlignment = Alignment.TopStart,
        ) {
            content()
        }
    }
}

// MARK: - Previews

@Preview(name = "RallyCard - All Styles", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun RallyCardPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier.padding(RallySpacing.md),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.md),
        ) {
            RallyCard(style = RallyCardStyle.Dark) {
                Column(verticalArrangement = Arrangement.spacedBy(RallySpacing.sm)) {
                    Text(
                        text = "Dark Card",
                        style = RallyTypography.cardTitle,
                        color = Color.White,
                    )
                    Text(
                        text = "Elevated container with navy mid background.",
                        style = RallyTypography.body,
                        color = RallyColors.Gray,
                    )
                }
            }

            RallyCard(style = RallyCardStyle.Light) {
                Column(verticalArrangement = Arrangement.spacedBy(RallySpacing.sm)) {
                    Text(
                        text = "Light Card",
                        style = RallyTypography.cardTitle,
                        color = RallyColors.Navy,
                    )
                    Text(
                        text = "Off-white background for lighter contexts.",
                        style = RallyTypography.body,
                        color = RallyColors.Gray,
                    )
                }
            }

            RallyCard(style = RallyCardStyle.Branded) {
                Column(verticalArrangement = Arrangement.spacedBy(RallySpacing.sm)) {
                    Text(
                        text = "Branded Card",
                        style = RallyTypography.cardTitle,
                        color = Color.White,
                    )
                    Text(
                        text = "Tinted with the active school theme color.",
                        style = RallyTypography.body,
                        color = RallyColors.Gray,
                    )
                }
            }
        }
    }
}
