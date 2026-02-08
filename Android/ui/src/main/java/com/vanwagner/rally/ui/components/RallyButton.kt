package com.vanwagner.rally.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.foundation.clickable
import com.vanwagner.rally.ui.theme.RallyColors
import com.vanwagner.rally.ui.theme.RallyGradients
import com.vanwagner.rally.ui.theme.RallyRadius
import com.vanwagner.rally.ui.theme.RallySpacing
import com.vanwagner.rally.ui.theme.RallyTypography

// ---------------------------------------------------------------------------
// RallyButton
// Primary call-to-action button with brand gradient, loading spinner, ripple
// feedback, and press-scale animation.
// Styles: Primary (gradient), Secondary (outline), Outline (alias for Secondary)
// ---------------------------------------------------------------------------

/** Visual variants for the button. */
enum class RallyButtonStyle {
    /** Brand gradient background with white text. */
    Primary,
    /** Outlined border with brand-colored text. */
    Secondary,
    /** Alias -- same as [Secondary] for spec naming. */
    Outline,
}

/** Size variants controlling height and horizontal padding. */
enum class RallyButtonSize(
    val height: Dp,
    val horizontalPadding: Dp,
) {
    Small(height = 36.dp, horizontalPadding = RallySpacing.sm),
    Medium(height = 48.dp, horizontalPadding = RallySpacing.md),
    Large(height = 56.dp, horizontalPadding = RallySpacing.lg),
}

/**
 * Rally design-system button.
 *
 * @param title       The button label text.
 * @param onClick     Callback invoked on tap (ignored while [isLoading]).
 * @param modifier    Optional [Modifier].
 * @param icon        Optional leading [ImageVector] icon.
 * @param style       Visual variant (default [RallyButtonStyle.Primary]).
 * @param size        Size variant (default [RallyButtonSize.Medium]).
 * @param isFullWidth Whether the button stretches to fill available width.
 * @param isLoading   When `true`, displays a spinner and disables interaction.
 * @param enabled     External enabled flag (combined with [isLoading]).
 */
@Composable
fun RallyButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    style: RallyButtonStyle = RallyButtonStyle.Primary,
    size: RallyButtonSize = RallyButtonSize.Medium,
    isFullWidth: Boolean = true,
    isLoading: Boolean = false,
    enabled: Boolean = true,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = tween(durationMillis = 150),
        label = "button_scale",
    )
    val effectiveEnabled = enabled && !isLoading

    val resolvedStyle = if (style == RallyButtonStyle.Outline) RallyButtonStyle.Secondary else style
    val shape = RoundedCornerShape(RallyRadius.button)
    val foreground = when (resolvedStyle) {
        RallyButtonStyle.Primary -> Color.White
        else -> RallyColors.Orange
    }
    val textStyle = when (size) {
        RallyButtonSize.Small -> RallyTypography.caption
        else -> RallyTypography.buttonLabel
    }

    val baseModifier = modifier
        .scale(scale)
        .alpha(if (isLoading) 0.8f else 1f)
        .then(if (isFullWidth) Modifier.fillMaxWidth() else Modifier)
        .height(size.height)
        .clip(shape)
        .then(
            when (resolvedStyle) {
                RallyButtonStyle.Primary -> Modifier.background(brush = RallyGradients.Brand, shape = shape)
                else -> Modifier.background(Color.Transparent, shape = shape)
            }
        )
        .then(
            if (resolvedStyle == RallyButtonStyle.Secondary) {
                Modifier.border(width = 1.5.dp, color = RallyColors.Orange, shape = shape)
            } else {
                Modifier
            }
        )
        .clickable(
            interactionSource = interactionSource,
            indication = ripple(color = foreground),
            enabled = effectiveEnabled,
            role = Role.Button,
            onClick = onClick,
        )
        .semantics {
            contentDescription = if (isLoading) "$title, loading" else title
            role = Role.Button
        }

    Box(
        modifier = baseModifier,
        contentAlignment = Alignment.Center,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(RallySpacing.sm, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = size.horizontalPadding),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(if (size == RallyButtonSize.Small) 16.dp else 20.dp),
                    color = foreground,
                    strokeWidth = 2.dp,
                )
            } else {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = foreground,
                        modifier = Modifier.size(if (size == RallyButtonSize.Small) 16.dp else 20.dp),
                    )
                }
                Text(
                    text = title,
                    style = textStyle,
                    color = foreground,
                )
            }
        }
    }
}

// MARK: - Previews

@Preview(name = "RallyButton - All Styles", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun RallyButtonPreview() {
    Surface(color = RallyColors.Navy) {
        androidx.compose.foundation.layout.Column(
            modifier = Modifier.padding(RallySpacing.md),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.md),
        ) {
            RallyButton(
                title = "Check In Now",
                onClick = {},
                icon = Icons.Filled.LocationOn,
            )
            RallyButton(
                title = "Loading",
                onClick = {},
                isLoading = true,
            )
            RallyButton(
                title = "Get Reward",
                onClick = {},
                style = RallyButtonStyle.Secondary,
            )
            RallyButton(
                title = "View Details",
                onClick = {},
                style = RallyButtonStyle.Outline,
                isFullWidth = false,
            )
            RallyButton(
                title = "Small",
                onClick = {},
                size = RallyButtonSize.Small,
                isFullWidth = false,
            )
            RallyButton(
                title = "Large",
                onClick = {},
                size = RallyButtonSize.Large,
            )
        }
    }
}
