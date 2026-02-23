package com.rally.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography
import com.rally.app.ui.theme.tierColor
import kotlin.math.roundToInt

// ---------------------------------------------------------------------------
// PointsBadge
// Animated points counter with a tier-colored accent ring.
// The displayed value animates numerically (count-up) when `points` changes.
// ---------------------------------------------------------------------------

/** Size variants for the badge. */
enum class PointsBadgeSize(val diameter: Dp, val ringWidth: Dp) {
    Compact(diameter = 48.dp, ringWidth = 2.dp),
    Regular(diameter = 72.dp, ringWidth = 3.dp),
    Large(diameter = 96.dp, ringWidth = 4.dp),
}

/**
 * Animated points badge with tier-colored accent ring.
 *
 * @param points    The current point balance to display.
 * @param tier      The user's loyalty tier name (e.g. "Rookie", "All-Star").
 * @param modifier  Optional [Modifier].
 * @param size      Badge size variant (default [PointsBadgeSize.Regular]).
 * @param showLabel Whether to show "PTS" label beneath the number.
 */
@Composable
fun PointsBadge(
    points: Int,
    tier: String,
    modifier: Modifier = Modifier,
    size: PointsBadgeSize = PointsBadgeSize.Regular,
    showLabel: Boolean = true,
) {
    val color = tierColor(tier)

    // Animated count-up value
    var displayedPoints by remember { mutableIntStateOf(0) }
    val animatable = remember { Animatable(0f) }

    LaunchedEffect(points) {
        val start = displayedPoints
        animatable.snapTo(0f)
        animatable.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 600),
        ) {
            displayedPoints = (start + (points - start) * value).roundToInt()
        }
        displayedPoints = points // ensure exact final value
    }

    val textStyle = when (size) {
        PointsBadgeSize.Compact -> RallyTypography.buttonLabel
        PointsBadgeSize.Regular -> RallyTypography.pointsDisplay
        PointsBadgeSize.Large   -> RallyTypography.heroTitle
    }

    Column(
        modifier = modifier
            .semantics {
                contentDescription = "$points points, $tier tier"
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(RallySpacing.xs),
    ) {
        Box(
            modifier = Modifier.size(size.diameter),
            contentAlignment = Alignment.Center,
        ) {
            // Tier accent ring
            val ringBrush = Brush.sweepGradient(
                colors = listOf(color, color.copy(alpha = 0.4f), color),
            )
            Canvas(modifier = Modifier.size(size.diameter)) {
                drawCircle(
                    brush = ringBrush,
                    style = Stroke(width = size.ringWidth.toPx(), cap = StrokeCap.Round),
                )
            }

            // Points number
            Text(
                text = "$displayedPoints",
                style = textStyle,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = RallySpacing.xs),
            )
        }

        if (showLabel && size != PointsBadgeSize.Compact) {
            Text(
                text = "PTS",
                style = RallyTypography.caption,
                color = RallyColors.Gray,
            )
        }
    }
}

// MARK: - Previews

@Preview(name = "PointsBadge - Sizes", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun PointsBadgePreview() {
    Surface(color = RallyColors.Navy) {
        Row(
            modifier = Modifier.padding(RallySpacing.lg),
            horizontalArrangement = Arrangement.spacedBy(RallySpacing.lg),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PointsBadge(points = 250, tier = "Rookie", size = PointsBadgeSize.Compact, showLabel = false)
            PointsBadge(points = 1250, tier = "All-Star")
            PointsBadge(points = 15820, tier = "Hall of Fame", size = PointsBadgeSize.Large)
        }
    }
}
