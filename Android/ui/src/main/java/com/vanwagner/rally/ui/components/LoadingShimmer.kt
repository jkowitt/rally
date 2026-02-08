package com.vanwagner.rally.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.vanwagner.rally.ui.theme.RallyColors
import com.vanwagner.rally.ui.theme.RallyRadius
import com.vanwagner.rally.ui.theme.RallySpacing
import com.vanwagner.rally.ui.theme.RallyTypography

// ---------------------------------------------------------------------------
// LoadingShimmer
// Skeleton placeholder with an infinite shimmer animation.
// Predefined shapes: Card, Row, Circle, Banner, Rectangle.
// ---------------------------------------------------------------------------

/** Predefined skeleton shapes matching Rally UI component layouts. */
sealed class ShimmerShape {
    /** Full-width card skeleton (matches RallyCard / ActivationCard). */
    data object Card : ShimmerShape()

    /** Horizontal row skeleton (matches RewardRow / LeaderboardRow). */
    data object Row : ShimmerShape()

    /** Circular badge skeleton (matches PointsBadge). */
    data class Circle(val diameter: Dp = 72.dp) : ShimmerShape()

    /** Banner skeleton (matches SchoolHeader). */
    data object Banner : ShimmerShape()

    /** Custom rectangular skeleton. */
    data class Rectangle(val width: Dp? = null, val height: Dp) : ShimmerShape()
}

/**
 * Loading shimmer placeholder.
 *
 * @param modifier Optional [Modifier].
 * @param shape    The skeleton shape to render (default [ShimmerShape.Card]).
 * @param count    Number of skeleton items to stack (default 1).
 */
@Composable
fun LoadingShimmer(
    modifier: Modifier = Modifier,
    shape: ShimmerShape = ShimmerShape.Card,
    count: Int = 1,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmer_offset",
    )

    Column(
        modifier = modifier
            .semantics { contentDescription = "Loading content" },
        verticalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
    ) {
        repeat(count.coerceAtLeast(1)) {
            ShimmerContent(shape = shape, offset = shimmerOffset)
        }
    }
}

@Composable
private fun ShimmerContent(shape: ShimmerShape, offset: Float) {
    when (shape) {
        is ShimmerShape.Card      -> CardSkeleton(offset)
        is ShimmerShape.Row       -> RowSkeleton(offset)
        is ShimmerShape.Circle    -> CircleSkeleton(offset, shape.diameter)
        is ShimmerShape.Banner    -> BannerSkeleton(offset)
        is ShimmerShape.Rectangle -> RectangleSkeleton(offset, shape.width, shape.height)
    }
}

// -- Shimmer brush helper --

@Composable
private fun shimmerBrush(offset: Float): Brush {
    val colors = listOf(
        RallyColors.Gray.copy(alpha = 0.15f),
        RallyColors.Gray.copy(alpha = 0.25f),
        RallyColors.Gray.copy(alpha = 0.15f),
    )
    return Brush.linearGradient(
        colors = colors,
        start = Offset(x = offset * 1000f, y = 0f),
        end = Offset(x = (offset + 1f) * 1000f, y = 0f),
    )
}

@Composable
private fun ShimmerRect(
    offset: Float,
    modifier: Modifier = Modifier,
    width: Dp? = null,
    height: Dp = 16.dp,
    radius: Dp = 4.dp,
) {
    Box(
        modifier = modifier
            .then(if (width != null) Modifier.width(width) else Modifier)
            .height(height)
            .clip(RoundedCornerShape(radius))
            .background(shimmerBrush(offset)),
    )
}

// -- Card Skeleton --

@Composable
private fun CardSkeleton(offset: Float) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(RallyRadius.card))
            .background(RallyColors.NavyMid)
            .padding(RallySpacing.md)
            .height(160.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        // Icon placeholder
        ShimmerRect(offset, width = 40.dp, height = 40.dp, radius = RallyRadius.small)

        // Title line
        ShimmerRect(
            offset,
            modifier = Modifier
                .fillMaxWidth()
                .padding(end = RallySpacing.xxxl),
            height = 18.dp,
        )

        // Body lines
        ShimmerRect(offset, modifier = Modifier.fillMaxWidth(), height = 12.dp)
        ShimmerRect(
            offset,
            modifier = Modifier
                .fillMaxWidth()
                .padding(end = RallySpacing.xl),
            height = 12.dp,
        )

        // Bottom row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            ShimmerRect(offset, width = 80.dp, height = 14.dp)
            ShimmerRect(offset, width = 60.dp, height = 14.dp)
        }
    }
}

// -- Row Skeleton --

@Composable
private fun RowSkeleton(offset: Float) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(RallyRadius.card))
            .background(RallyColors.NavyMid)
            .padding(RallySpacing.smMd),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
    ) {
        // Image placeholder
        ShimmerRect(offset, width = 72.dp, height = 72.dp, radius = RallyRadius.small)

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.sm),
        ) {
            ShimmerRect(offset, width = 180.dp, height = 16.dp)
            ShimmerRect(offset, width = 120.dp, height = 12.dp)
            ShimmerRect(offset, width = 80.dp, height = 14.dp)
        }

        ShimmerRect(offset, width = 64.dp, height = 32.dp, radius = RallyRadius.button)
    }
}

// -- Circle Skeleton --

@Composable
private fun CircleSkeleton(offset: Float, diameter: Dp) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(RallySpacing.xs),
    ) {
        Box(
            modifier = Modifier
                .size(diameter)
                .clip(CircleShape)
                .background(shimmerBrush(offset)),
        )
        ShimmerRect(offset, width = 32.dp, height = 10.dp)
    }
}

// -- Banner Skeleton --

@Composable
private fun BannerSkeleton(offset: Float) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(RoundedCornerShape(RallyRadius.card))
            .background(shimmerBrush(offset)),
        contentAlignment = Alignment.BottomStart,
    ) {
        Row(
            modifier = Modifier.padding(RallySpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.1f)),
            )
            Column(verticalArrangement = Arrangement.spacedBy(RallySpacing.sm)) {
                ShimmerRect(offset, width = 160.dp, height = 20.dp)
                ShimmerRect(offset, width = 100.dp, height = 14.dp)
            }
        }
    }
}

// -- Rectangle Skeleton --

@Composable
private fun RectangleSkeleton(offset: Float, width: Dp?, height: Dp) {
    ShimmerRect(
        offset = offset,
        width = width,
        height = height,
        radius = RallyRadius.small,
        modifier = if (width == null) Modifier.fillMaxWidth() else Modifier,
    )
}

// MARK: - Previews

@Preview(name = "LoadingShimmer - All Shapes", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun LoadingShimmerPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier
                .padding(RallySpacing.md)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.lg),
        ) {
            Text("Card Skeleton", style = RallyTypography.caption, color = RallyColors.Gray)
            LoadingShimmer(shape = ShimmerShape.Card)

            Text("Row Skeletons", style = RallyTypography.caption, color = RallyColors.Gray)
            LoadingShimmer(shape = ShimmerShape.Row, count = 3)

            Text("Circle Skeleton", style = RallyTypography.caption, color = RallyColors.Gray)
            LoadingShimmer(shape = ShimmerShape.Circle())

            Text("Banner Skeleton", style = RallyTypography.caption, color = RallyColors.Gray)
            LoadingShimmer(shape = ShimmerShape.Banner)

            Text("Custom Rectangle", style = RallyTypography.caption, color = RallyColors.Gray)
            LoadingShimmer(shape = ShimmerShape.Rectangle(height = 44.dp))
        }
    }
}
