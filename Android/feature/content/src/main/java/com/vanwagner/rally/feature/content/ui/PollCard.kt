package com.vanwagner.rally.feature.content.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Poll
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.vanwagner.rally.core.model.Poll
import com.vanwagner.rally.core.theme.RallyTheme

/**
 * A poll card that displays a question with selectable options.
 *
 * Before voting: shows options as selectable rows.
 * After voting:  shows live result bars with percentages and highlights the selected option.
 */
@Composable
fun PollCard(
    poll: Poll,
    title: String,
    onVote: (optionIndex: Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val totalVotes = poll.voteCounts.sum().coerceAtLeast(1)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .animateContentSize(),
        ) {
            // ── Header ──────────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Poll,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(Modifier.height(8.dp))

            // ── Question ────────────────────────────────────────────────
            Text(
                text = poll.question,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Spacer(Modifier.height(16.dp))

            // ── Options ─────────────────────────────────────────────────
            poll.options.forEachIndexed { index, option ->
                if (poll.hasVoted) {
                    PollResultBar(
                        option = option,
                        voteCount = poll.voteCounts.getOrElse(index) { 0 },
                        totalVotes = totalVotes,
                        isSelected = index == poll.selectedOptionIndex,
                    )
                } else {
                    PollOptionRow(
                        option = option,
                        onClick = { onVote(index) },
                    )
                }
                if (index < poll.options.lastIndex) {
                    Spacer(Modifier.height(8.dp))
                }
            }

            // ── Total Votes ─────────────────────────────────────────────
            if (poll.hasVoted) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = "$totalVotes votes",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// ── Option Row (pre-vote) ───────────────────────────────────────────────

@Composable
private fun PollOptionRow(
    option: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 12.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Outlined.RadioButtonUnchecked,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = option,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

// ── Result Bar (post-vote) ──────────────────────────────────────────────

@Composable
private fun PollResultBar(
    option: String,
    voteCount: Int,
    totalVotes: Int,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
) {
    val fraction = voteCount.toFloat() / totalVotes.coerceAtLeast(1)
    val animatedFraction by animateFloatAsState(
        targetValue = fraction,
        animationSpec = tween(durationMillis = 600),
        label = "poll_bar",
    )
    val percentage = (fraction * 100).toInt()

    val barColor = if (isSelected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }

    val textColor = if (isSelected) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant),
    ) {
        // Filled portion
        Box(
            modifier = Modifier
                .fillMaxWidth(animatedFraction)
                .fillMaxHeight()
                .clip(RoundedCornerShape(8.dp))
                .background(barColor),
        )

        // Label overlay
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight()
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (isSelected) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = "Your vote",
                        modifier = Modifier.size(18.dp),
                        tint = textColor,
                    )
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    text = option,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) textColor else MaterialTheme.colorScheme.onSurface,
                )
            }
            Text(
                text = "$percentage%",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) textColor else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────

@Preview(showBackground = true)
@Composable
private fun PollCardPreVotePreview() {
    RallyTheme {
        PollCard(
            poll = Poll(
                question = "Who will score the first touchdown?",
                options = listOf("Player A", "Player B", "Player C", "Other"),
                voteCounts = listOf(42, 38, 15, 5),
                hasVoted = false,
            ),
            title = "Game Day Poll",
            onVote = {},
            modifier = Modifier.padding(16.dp),
        )
    }
}

@Preview(showBackground = true, name = "Post-Vote")
@Composable
private fun PollCardPostVotePreview() {
    RallyTheme {
        PollCard(
            poll = Poll(
                question = "Who will score the first touchdown?",
                options = listOf("Player A", "Player B", "Player C", "Other"),
                voteCounts = listOf(42, 38, 15, 5),
                hasVoted = true,
                selectedOptionIndex = 0,
            ),
            title = "Game Day Poll",
            onVote = {},
            modifier = Modifier.padding(16.dp),
        )
    }
}
