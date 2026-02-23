package com.rally.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography

// ---------------------------------------------------------------------------
// EmptyState
// Icon + title + message + optional CTA button.
// Provides convenience factory functions for common empty states:
// noEvents, noRewards, noLeaderboard, networkError.
// ---------------------------------------------------------------------------

/**
 * Empty state placeholder view.
 *
 * @param icon         [ImageVector] illustration displayed at the top.
 * @param title        Primary heading text.
 * @param message      Descriptive body text.
 * @param modifier     Optional [Modifier].
 * @param actionTitle  Optional button label. If `null`, no button is rendered.
 * @param onAction     Callback invoked when the optional CTA is tapped.
 */
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionTitle: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = RallySpacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Spacer(modifier = Modifier.weight(1f))

        // Illustration icon
        Icon(
            imageVector = icon,
            contentDescription = null, // decorative
            tint = RallyColors.Gray.copy(alpha = 0.5f),
            modifier = Modifier
                .size(56.dp)
                .padding(bottom = RallySpacing.sm),
        )

        // Title
        Text(
            text = title,
            style = RallyTypography.sectionHeader,
            color = androidx.compose.ui.graphics.Color.White,
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(RallySpacing.sm))

        // Message
        Text(
            text = message,
            style = RallyTypography.body,
            color = RallyColors.Gray,
            textAlign = TextAlign.Center,
            lineHeight = RallyTypography.body.lineHeight,
        )

        // Optional CTA
        if (actionTitle != null && onAction != null) {
            Spacer(modifier = Modifier.height(RallySpacing.md))
            RallyButton(
                title = actionTitle,
                onClick = onAction,
                style = RallyButtonStyle.Secondary,
                size = RallyButtonSize.Medium,
                isFullWidth = false,
            )
        }

        Spacer(modifier = Modifier.weight(1f))
    }
}

// MARK: - Convenience Factories

object EmptyStates {
    /** Empty state for no events. */
    @Composable
    fun NoEvents(modifier: Modifier = Modifier, onRefresh: (() -> Unit)? = null) {
        EmptyState(
            icon = Icons.Filled.CalendarMonth,
            title = "No Upcoming Events",
            message = "There are no events scheduled right now. Check back soon for the next gameday!",
            modifier = modifier,
            actionTitle = if (onRefresh != null) "Refresh" else null,
            onAction = onRefresh,
        )
    }

    /** Empty state for no rewards. */
    @Composable
    fun NoRewards(modifier: Modifier = Modifier, onBrowse: (() -> Unit)? = null) {
        EmptyState(
            icon = Icons.Filled.CardGiftcard,
            title = "No Rewards Available",
            message = "New rewards are added regularly. Keep earning points and check back soon!",
            modifier = modifier,
            actionTitle = if (onBrowse != null) "Browse Events" else null,
            onAction = onBrowse,
        )
    }

    /** Empty state for an empty leaderboard. */
    @Composable
    fun NoLeaderboard(modifier: Modifier = Modifier) {
        EmptyState(
            icon = Icons.Filled.EmojiEvents,
            title = "Leaderboard Coming Soon",
            message = "Complete activations during the event to see your ranking here.",
            modifier = modifier,
        )
    }

    /** Empty state for network errors. */
    @Composable
    fun NetworkError(modifier: Modifier = Modifier, onRetry: (() -> Unit)? = null) {
        EmptyState(
            icon = Icons.Filled.WifiOff,
            title = "Connection Issue",
            message = "We could not load this content. Please check your connection and try again.",
            modifier = modifier,
            actionTitle = "Try Again",
            onAction = onRetry,
        )
    }
}

// MARK: - Previews

@Preview(name = "EmptyState - Variants", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun EmptyStatePreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier
                .padding(RallySpacing.md)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.xxxl),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            EmptyState(
                icon = Icons.Filled.CalendarMonth,
                title = "No Upcoming Events",
                message = "There are no events scheduled right now. Check back soon!",
                actionTitle = "Browse Schools",
                onAction = {},
            )

            Divider(color = RallyColors.Gray.copy(alpha = 0.3f))

            EmptyStates.NetworkError(onRetry = {})

            Divider(color = RallyColors.Gray.copy(alpha = 0.3f))

            EmptyStates.NoLeaderboard()
        }
    }
}
