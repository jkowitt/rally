package com.rally.app.core.extension

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.abs

// ---------------------------------------------------------------------------
// Int extensions
// ---------------------------------------------------------------------------

/**
 * Formatted points display with thousands separator (e.g., "1,250 pts").
 */
val Int.pointsFormatted: String
    get() {
        val formatter = NumberFormat.getNumberInstance(Locale.getDefault())
        return "${formatter.format(this)} pts"
    }

/**
 * Abbreviated number display (e.g., "1.2K", "15K", "2.3M").
 */
val Int.abbreviated: String
    get() = when {
        this >= 1_000_000 -> String.format(Locale.US, "%.1fM", this / 1_000_000.0)
        this >= 1_000 -> String.format(Locale.US, "%.1fK", this / 1_000.0)
        else -> this.toString()
    }

// ---------------------------------------------------------------------------
// Long extensions (for epoch-millis timestamps used in the model layer)
// ---------------------------------------------------------------------------

/**
 * Converts an epoch-millis timestamp to a [Date].
 */
val Long.toDate: Date
    get() = Date(this)

/**
 * Relative time description (e.g., "2h ago", "in 3d").
 */
val Long.relativeDescription: String
    get() {
        val now = System.currentTimeMillis()
        val diff = this - now
        val absDiff = abs(diff)

        val value: Long
        val unit: String

        when {
            absDiff < TimeUnit.MINUTES.toMillis(1) -> return if (diff >= 0) "just now" else "just now"
            absDiff < TimeUnit.HOURS.toMillis(1) -> {
                value = TimeUnit.MILLISECONDS.toMinutes(absDiff)
                unit = "m"
            }
            absDiff < TimeUnit.DAYS.toMillis(1) -> {
                value = TimeUnit.MILLISECONDS.toHours(absDiff)
                unit = "h"
            }
            absDiff < TimeUnit.DAYS.toMillis(30) -> {
                value = TimeUnit.MILLISECONDS.toDays(absDiff)
                unit = "d"
            }
            absDiff < TimeUnit.DAYS.toMillis(365) -> {
                value = TimeUnit.MILLISECONDS.toDays(absDiff) / 30
                unit = "mo"
            }
            else -> {
                value = TimeUnit.MILLISECONDS.toDays(absDiff) / 365
                unit = "y"
            }
        }

        return if (diff > 0) "in $value$unit" else "$value$unit ago"
    }

/**
 * Countdown components from now until this timestamp.
 *
 * @return A [CountdownComponents] object, or null if the timestamp is in the past.
 */
val Long.countdownComponents: CountdownComponents?
    get() {
        val now = System.currentTimeMillis()
        if (this <= now) return null
        val interval = this - now
        val totalSeconds = interval / 1000
        val days = (totalSeconds / 86400).toInt()
        val hours = ((totalSeconds % 86400) / 3600).toInt()
        val minutes = ((totalSeconds % 3600) / 60).toInt()
        val seconds = (totalSeconds % 60).toInt()
        return CountdownComponents(days, hours, minutes, seconds)
    }

/**
 * Formatted gameday display (e.g., "Sat, Oct 12 \u2022 3:30 PM").
 */
val Long.gamedayFormatted: String
    get() {
        val date = Date(this)
        val datePart = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(date)
        val timePart = SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
        return "$datePart \u2022 $timePart"
    }

/**
 * Short time display (e.g., "3:30 PM").
 */
val Long.shortTime: String
    get() {
        val date = Date(this)
        return SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
    }

/**
 * Components of a countdown timer.
 */
data class CountdownComponents(
    val days: Int,
    val hours: Int,
    val minutes: Int,
    val seconds: Int
) {
    /**
     * Formatted countdown string (e.g., "3d 12h 05m 30s").
     */
    override fun toString(): String = buildString {
        if (days > 0) append("${days}d ")
        if (days > 0 || hours > 0) append("${hours}h ")
        append("${String.format(Locale.US, "%02d", minutes)}m ")
        append("${String.format(Locale.US, "%02d", seconds)}s")
    }
}
