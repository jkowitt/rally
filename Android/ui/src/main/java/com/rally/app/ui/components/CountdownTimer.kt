package com.rally.app.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallyRadius
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography
import java.util.Timer
import java.util.TimerTask

// ---------------------------------------------------------------------------
// CountdownTimer
// Live countdown displaying days / hours / minutes / seconds until a target
// epoch. Available in Compact (inline text) and Expanded (segmented boxes)
// styles with animated digit transitions.
// ---------------------------------------------------------------------------

/** Display style for the countdown. */
enum class CountdownTimerStyle {
    /** Single-line inline format (e.g. "2h 15m 30s"). */
    Compact,
    /** Segmented boxes showing each unit separately with labels. */
    Expanded,
}

/**
 * Countdown timer composable.
 *
 * @param targetEpochMs The future epoch timestamp (milliseconds) to count down to.
 * @param modifier      Optional [Modifier].
 * @param style         Display variant (default [CountdownTimerStyle.Expanded]).
 * @param label         Optional label shown above/before the countdown text.
 * @param onExpired     Callback invoked when the countdown reaches zero.
 */
@Composable
fun CountdownTimer(
    targetEpochMs: Long,
    modifier: Modifier = Modifier,
    style: CountdownTimerStyle = CountdownTimerStyle.Expanded,
    label: String? = null,
    onExpired: (() -> Unit)? = null,
) {
    var remainingMs by remember { mutableLongStateOf(maxOf(0L, targetEpochMs - System.currentTimeMillis())) }

    // 1-second tick timer
    DisposableEffect(targetEpochMs) {
        val timer = Timer("CountdownTimer", true)
        timer.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                val diff = targetEpochMs - System.currentTimeMillis()
                if (diff <= 0L && remainingMs > 0L) {
                    remainingMs = 0L
                    onExpired?.invoke()
                } else {
                    remainingMs = maxOf(0L, diff)
                }
            }
        }, 0L, 1_000L)
        onDispose { timer.cancel() }
    }

    val totalSeconds = (remainingMs / 1_000).toInt()
    val days = totalSeconds / 86_400
    val hours = (totalSeconds % 86_400) / 3_600
    val minutes = (totalSeconds % 3_600) / 60
    val seconds = totalSeconds % 60

    // Accessibility label
    val a11y = buildString {
        if (remainingMs <= 0) {
            if (label != null) append("$label: expired") else append("Timer expired")
        } else {
            val parts = mutableListOf<String>()
            if (days > 0) parts += "$days day${if (days == 1) "" else "s"}"
            if (hours > 0) parts += "$hours hour${if (hours == 1) "" else "s"}"
            if (minutes > 0) parts += "$minutes minute${if (minutes == 1) "" else "s"}"
            if (seconds > 0 && days == 0) parts += "$seconds second${if (seconds == 1) "" else "s"}"
            val timeStr = parts.joinToString(", ")
            if (label != null) append("$label: $timeStr remaining")
            else append("$timeStr remaining")
        }
    }

    when (style) {
        CountdownTimerStyle.Compact -> CompactCountdown(
            days = days,
            hours = hours,
            minutes = minutes,
            seconds = seconds,
            expired = remainingMs <= 0,
            label = label,
            a11y = a11y,
            modifier = modifier,
        )
        CountdownTimerStyle.Expanded -> ExpandedCountdown(
            days = days,
            hours = hours,
            minutes = minutes,
            seconds = seconds,
            expired = remainingMs <= 0,
            label = label,
            a11y = a11y,
            modifier = modifier,
        )
    }
}

// -- Compact layout --

@Composable
private fun CompactCountdown(
    days: Int,
    hours: Int,
    minutes: Int,
    seconds: Int,
    expired: Boolean,
    label: String?,
    a11y: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.semantics { contentDescription = a11y },
        horizontalArrangement = Arrangement.spacedBy(RallySpacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (label != null) {
            Text(
                text = label,
                style = RallyTypography.caption,
                color = RallyColors.Gray,
            )
        }
        if (expired) {
            Text(
                text = "Expired",
                style = RallyTypography.caption,
                color = RallyColors.Error,
            )
        } else {
            val text = when {
                days > 0 -> "${days}d ${hours}h ${minutes}m"
                hours > 0 -> "${hours}h ${minutes}m ${seconds}s"
                else -> "${minutes}m ${seconds}s"
            }
            Text(
                text = text,
                style = RallyTypography.caption.copy(fontWeight = FontWeight.SemiBold),
                color = Color.White,
            )
        }
    }
}

// -- Expanded layout --

@Composable
private fun ExpandedCountdown(
    days: Int,
    hours: Int,
    minutes: Int,
    seconds: Int,
    expired: Boolean,
    label: String?,
    a11y: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.semantics { contentDescription = a11y },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(RallySpacing.sm),
    ) {
        if (label != null) {
            Text(
                text = label.uppercase(),
                style = RallyTypography.caption,
                color = RallyColors.Gray,
            )
        }
        if (expired) {
            Text(
                text = "Event Started",
                style = RallyTypography.cardTitle,
                color = RallyColors.Success,
            )
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(RallySpacing.sm)) {
                if (days > 0) {
                    TimeSegment(value = days, unit = "DAY")
                }
                TimeSegment(value = hours, unit = "HR")
                TimeSegment(value = minutes, unit = "MIN")
                TimeSegment(value = seconds, unit = "SEC")
            }
        }
    }
}

@Composable
private fun TimeSegment(value: Int, unit: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(RallySpacing.xs),
    ) {
        AnimatedContent(
            targetState = value,
            transitionSpec = {
                slideInVertically { -it } togetherWith slideOutVertically { it }
            },
            label = "time_segment_$unit",
        ) { targetValue ->
            Text(
                text = String.format("%02d", targetValue),
                style = RallyTypography.pointsDisplay,
                color = Color.White,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .widthIn(min = 48.dp)
                    .background(
                        color = RallyColors.NavyMid,
                        shape = RoundedCornerShape(RallyRadius.small),
                    )
                    .padding(vertical = RallySpacing.sm, horizontal = RallySpacing.xs),
            )
        }
        Text(
            text = unit,
            style = RallyTypography.caption.copy(fontWeight = FontWeight.Medium),
            color = RallyColors.Gray,
        )
    }
}

// MARK: - Previews

@Preview(name = "CountdownTimer - Styles", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun CountdownTimerPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier.padding(RallySpacing.lg),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CountdownTimer(
                targetEpochMs = System.currentTimeMillis() + 90_061_000,
                style = CountdownTimerStyle.Expanded,
                label = "Kickoff",
            )
            CountdownTimer(
                targetEpochMs = System.currentTimeMillis() + 3_661_000,
                style = CountdownTimerStyle.Expanded,
            )
            CountdownTimer(
                targetEpochMs = System.currentTimeMillis() + 185_000,
                style = CountdownTimerStyle.Compact,
                label = "Ends in",
            )
            CountdownTimer(
                targetEpochMs = System.currentTimeMillis() - 10_000,
                style = CountdownTimerStyle.Compact,
                label = "Event",
            )
        }
    }
}
