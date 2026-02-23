package com.rally.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallyRadius
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography

// ---------------------------------------------------------------------------
// ActivationCard
// Gameday activation tile: icon, title, description, points value, status
// badge, and optional countdown timer.
// ---------------------------------------------------------------------------

/** Activation types matching the iOS model. */
enum class ActivationType {
    Prediction, Trivia, NoiseMeter, Poll, PhotoChallenge, CheckIn, Survey
}

/** Activation status matching the iOS model. */
enum class ActivationStatus {
    Active, Upcoming, Completed, Locked
}

/**
 * Gameday activation card.
 *
 * @param title        Activation title.
 * @param description  Short description text.
 * @param pointsValue  Points earned on completion.
 * @param type         The [ActivationType] determining the icon.
 * @param status       The [ActivationStatus] determining appearance and badge.
 * @param modifier     Optional [Modifier].
 * @param brandColor   School primary color used for active-state accent.
 * @param countdownTargetMs Epoch millis for the countdown. Pass `null` to hide the timer.
 * @param countdownLabel Label shown next to the countdown (e.g. "Ends in", "Starts in").
 * @param onTap        Callback invoked when the card is tapped.
 */
@Composable
fun ActivationCard(
    title: String,
    description: String,
    pointsValue: Int,
    type: ActivationType,
    status: ActivationStatus,
    modifier: Modifier = Modifier,
    brandColor: Color = RallyColors.Orange,
    countdownTargetMs: Long? = null,
    countdownLabel: String? = null,
    onTap: (() -> Unit)? = null,
) {
    val iconVector = activationIcon(type)
    val iconColor = when (status) {
        ActivationStatus.Active    -> brandColor
        ActivationStatus.Upcoming  -> RallyColors.Blue
        ActivationStatus.Completed -> RallyColors.Success
        ActivationStatus.Locked    -> RallyColors.Gray
    }
    val statusText = when (status) {
        ActivationStatus.Active    -> "LIVE"
        ActivationStatus.Upcoming  -> "UPCOMING"
        ActivationStatus.Completed -> "DONE"
        ActivationStatus.Locked    -> "LOCKED"
    }
    val statusColor = when (status) {
        ActivationStatus.Active    -> RallyColors.Success
        ActivationStatus.Upcoming  -> RallyColors.Blue
        ActivationStatus.Completed -> RallyColors.Gray
        ActivationStatus.Locked    -> RallyColors.Gray
    }
    val borderColor = if (status == ActivationStatus.Active) {
        brandColor.copy(alpha = 0.4f)
    } else {
        Color.Transparent
    }
    val isInteractive = status != ActivationStatus.Locked && status != ActivationStatus.Completed
    val shape = RoundedCornerShape(RallyRadius.card)

    val a11yLabel = buildString {
        append("$title, $pointsValue points")
        when (status) {
            ActivationStatus.Active    -> append(", live now")
            ActivationStatus.Upcoming  -> append(", upcoming")
            ActivationStatus.Completed -> append(", completed")
            ActivationStatus.Locked    -> append(", locked")
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 160.dp)
            .clip(shape)
            .background(RallyColors.NavyMid, shape)
            .border(
                width = if (status == ActivationStatus.Active) 1.5.dp else 0.dp,
                color = borderColor,
                shape = shape,
            )
            .alpha(if (status == ActivationStatus.Locked) 0.5f else 1f)
            .then(
                if (isInteractive && onTap != null) {
                    Modifier.clickable(onClick = onTap)
                } else {
                    Modifier
                }
            )
            .padding(RallySpacing.md)
            .semantics { contentDescription = a11yLabel },
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        // Top row: icon + status badge
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Activation icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(RallyRadius.small))
                    .background(iconColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = iconVector,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp),
                )
            }

            // Status badge
            Text(
                text = statusText,
                style = RallyTypography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = statusColor,
                modifier = Modifier
                    .background(
                        color = statusColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(50),
                    )
                    .padding(horizontal = RallySpacing.sm, vertical = RallySpacing.xs),
            )
        }

        Spacer(modifier = Modifier.padding(top = RallySpacing.smMd))

        // Title
        Text(
            text = title,
            style = RallyTypography.cardTitle,
            color = Color.White,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        // Description
        if (description.isNotEmpty()) {
            Text(
                text = description,
                style = RallyTypography.caption,
                color = RallyColors.Gray,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = RallySpacing.xs),
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Bottom row: points + countdown
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = RallySpacing.smMd),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            // Points label
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(RallySpacing.xs),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = RallyColors.Orange,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = "+$pointsValue pts",
                    style = RallyTypography.buttonLabel,
                    color = RallyColors.Orange,
                )
            }

            // Countdown (compact)
            if (countdownTargetMs != null) {
                CountdownTimer(
                    targetEpochMs = countdownTargetMs,
                    style = CountdownTimerStyle.Compact,
                    label = countdownLabel,
                )
            }
        }
    }
}

// -- Icon mapping --

private fun activationIcon(type: ActivationType): ImageVector = when (type) {
    ActivationType.Prediction     -> Icons.Filled.BarChart
    ActivationType.Trivia         -> Icons.Filled.Psychology
    ActivationType.NoiseMeter     -> Icons.Filled.GraphicEq
    ActivationType.Poll           -> Icons.Filled.PieChart
    ActivationType.PhotoChallenge -> Icons.Filled.CameraAlt
    ActivationType.CheckIn        -> Icons.Filled.LocationOn
    ActivationType.Survey         -> Icons.Filled.Checklist
}

// MARK: - Previews

@Preview(name = "ActivationCard - Statuses", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun ActivationCardPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier
                .padding(RallySpacing.md)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.md),
        ) {
            ActivationCard(
                title = "Halftime Score Prediction",
                description = "Guess the halftime score to earn bonus points!",
                pointsValue = 100,
                type = ActivationType.Prediction,
                status = ActivationStatus.Upcoming,
                countdownTargetMs = System.currentTimeMillis() + 3_600_000,
                countdownLabel = "Starts in",
            )
            ActivationCard(
                title = "Noise Meter Challenge",
                description = "Make some noise for your team!",
                pointsValue = 50,
                type = ActivationType.NoiseMeter,
                status = ActivationStatus.Active,
                countdownTargetMs = System.currentTimeMillis() + 300_000,
                countdownLabel = "Ends in",
            )
            ActivationCard(
                title = "Team Trivia",
                description = "",
                pointsValue = 75,
                type = ActivationType.Trivia,
                status = ActivationStatus.Locked,
            )
        }
    }
}
