package com.rally.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.rally.app.ui.theme.RallyColors
import com.rally.app.ui.theme.RallyRadius
import com.rally.app.ui.theme.RallySpacing
import com.rally.app.ui.theme.RallyTypography
import com.rally.app.ui.theme.tierColor
import java.text.NumberFormat
import java.util.Locale

// ---------------------------------------------------------------------------
// LeaderboardRow
// Rank, avatar, display name, tier badge, and score.
// Highlights the current user's row with a branded accent border/background.
// ---------------------------------------------------------------------------

/**
 * Leaderboard entry row.
 *
 * @param rank          The user's rank position.
 * @param displayName   The user's display name.
 * @param score         The user's total score.
 * @param tier          Tier name (e.g. "Rookie", "MVP").
 * @param modifier      Optional [Modifier].
 * @param isCurrentUser Whether this row represents the current user.
 * @param accentColor   School primary color used for current-user highlight.
 * @param avatarUrl     Optional avatar URL (placeholder rendered if null).
 */
@Composable
fun LeaderboardRow(
    rank: Int,
    displayName: String,
    score: Int,
    tier: String,
    modifier: Modifier = Modifier,
    isCurrentUser: Boolean = false,
    accentColor: Color = RallyColors.Orange,
    avatarUrl: String? = null,
) {
    val tColor = tierColor(tier)
    val scoreFormatted = NumberFormat.getNumberInstance(Locale.US).format(score)
    val shape = RoundedCornerShape(RallyRadius.small)

    val a11y = buildString {
        append("Rank $rank, $displayName, $score points, $tier tier")
        if (isCurrentUser) append(", your position")
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(
                if (isCurrentUser) accentColor.copy(alpha = 0.08f) else Color.Transparent,
                shape,
            )
            .then(
                if (isCurrentUser) {
                    Modifier.border(1.dp, accentColor.copy(alpha = 0.3f), shape)
                } else {
                    Modifier
                }
            )
            .padding(horizontal = RallySpacing.md, vertical = RallySpacing.smMd)
            .semantics { contentDescription = a11y },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
    ) {
        // Rank
        if (rank <= 3) {
            val medalColor = when (rank) {
                1 -> Color(0xFFFFD700) // Gold
                2 -> Color(0xFFC0C0C7) // Silver
                3 -> Color(0xFFCC8033) // Bronze
                else -> RallyColors.Gray
            }
            Icon(
                imageVector = Icons.Filled.EmojiEvents,
                contentDescription = null,
                tint = medalColor,
                modifier = Modifier
                    .size(20.dp)
                    .width(32.dp),
            )
        } else {
            Text(
                text = "#$rank",
                style = RallyTypography.buttonLabel,
                color = RallyColors.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(32.dp),
            )
        }

        // Avatar placeholder
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(tColor.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = displayName.take(1).uppercase(),
                style = RallyTypography.buttonLabel,
                color = tColor,
            )
        }

        // Name + tier
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(RallySpacing.xs),
            ) {
                Text(
                    text = displayName,
                    style = RallyTypography.buttonLabel,
                    color = if (isCurrentUser) accentColor else Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (isCurrentUser) {
                    Text(
                        text = "You",
                        style = RallyTypography.caption,
                        color = accentColor,
                        modifier = Modifier
                            .background(
                                color = accentColor.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(50),
                            )
                            .padding(horizontal = RallySpacing.sm, vertical = 1.dp),
                    )
                }
            }
            Text(
                text = tier,
                style = RallyTypography.caption,
                color = tColor,
            )
        }

        // Score
        Text(
            text = scoreFormatted,
            style = RallyTypography.pointsDisplay,
            color = Color.White,
        )
    }
}

// MARK: - Previews

@Preview(name = "LeaderboardRow - List", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun LeaderboardRowPreview() {
    data class Entry(
        val rank: Int,
        val name: String,
        val score: Int,
        val tier: String,
        val isCurrent: Boolean = false,
    )

    val entries = listOf(
        Entry(1, "Alex Thompson", 4850, "MVP"),
        Entry(2, "Jordan Lee", 3720, "All-Star"),
        Entry(3, "Sam Rivera", 3100, "All-Star"),
        Entry(12, "You", 1250, "Starter", isCurrent = true),
        Entry(13, "Chris Park", 980, "Rookie"),
    )

    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier
                .padding(RallySpacing.md)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.xs),
        ) {
            entries.forEach { entry ->
                LeaderboardRow(
                    rank = entry.rank,
                    displayName = entry.name,
                    score = entry.score,
                    tier = entry.tier,
                    isCurrentUser = entry.isCurrent,
                )
            }
        }
    }
}
