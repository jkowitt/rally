package com.rally.app.feature.gameday.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.rally.app.core.model.LeaderboardEntry
import com.rally.app.core.model.Tier
import com.rally.app.feature.gameday.viewmodel.GamedayUiState
import com.rally.app.feature.gameday.viewmodel.GamedayViewModel
import kotlinx.coroutines.delay

// ── Screen ──────────────────────────────────────────────────────────────────

@Composable
fun LeaderboardScreen(
    currentUserId: String = "",
    onNavigateBack: () -> Unit = {},
    viewModel: GamedayViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LeaderboardContent(
        entries = uiState.leaderboard,
        currentUserId = currentUserId,
        onNavigateBack = onNavigateBack,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeaderboardContent(
    entries: List<LeaderboardEntry>,
    currentUserId: String = "",
    onNavigateBack: () -> Unit = {},
) {
    val top3 = entries.take(3)
    val rest = entries.drop(3)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Leaderboard") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
        ) {
            // Podium for Top 3
            if (top3.isNotEmpty()) {
                item {
                    PodiumSection(
                        top3 = top3,
                        currentUserId = currentUserId,
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }

            // Rest of the leaderboard
            itemsIndexed(
                items = rest,
                key = { _, entry -> entry.userID },
            ) { index, entry ->
                val rank = index + 4 // Rank starts at 4 after podium
                val isCurrentUser = entry.userID == currentUserId
                LeaderboardRow(
                    rank = rank,
                    entry = entry,
                    isCurrentUser = isCurrentUser,
                )
                if (index < rest.lastIndex) {
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

// ── Podium ──────────────────────────────────────────────────────────────────

@Composable
private fun PodiumSection(
    top3: List<LeaderboardEntry>,
    currentUserId: String,
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(100)
        visible = true
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(spring(stiffness = Spring.StiffnessLow)) +
            slideInVertically(spring(stiffness = Spring.StiffnessLow)) { -it / 3 },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Podium layout: 2nd - 1st - 3rd
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.Bottom,
            ) {
                // 2nd Place
                if (top3.size > 1) {
                    PodiumPlace(
                        entry = top3[1],
                        rank = 2,
                        podiumHeight = 100.dp.value,
                        medalColor = Color(0xFFC0C0C0), // Silver
                        isCurrentUser = top3[1].userID == currentUserId,
                    )
                }

                // 1st Place
                if (top3.isNotEmpty()) {
                    PodiumPlace(
                        entry = top3[0],
                        rank = 1,
                        podiumHeight = 140.dp.value,
                        medalColor = Color(0xFFFFD700), // Gold
                        isCurrentUser = top3[0].userID == currentUserId,
                    )
                }

                // 3rd Place
                if (top3.size > 2) {
                    PodiumPlace(
                        entry = top3[2],
                        rank = 3,
                        podiumHeight = 70.dp.value,
                        medalColor = Color(0xFFCD7F32), // Bronze
                        isCurrentUser = top3[2].userID == currentUserId,
                    )
                }
            }
        }
    }
}

@Composable
private fun PodiumPlace(
    entry: LeaderboardEntry,
    rank: Int,
    podiumHeight: Float,
    medalColor: Color,
    isCurrentUser: Boolean,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(100.dp),
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(
                    if (isCurrentUser) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
                .then(
                    if (isCurrentUser) {
                        Modifier.border(3.dp, MaterialTheme.colorScheme.primary, CircleShape)
                    } else {
                        Modifier
                    }
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = entry.displayName.take(2).uppercase(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (isCurrentUser) {
                    MaterialTheme.colorScheme.onPrimaryContainer
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = entry.displayName,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            fontWeight = if (isCurrentUser) FontWeight.Bold else FontWeight.Normal,
        )

        Text(
            text = "${entry.score} pts",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Podium block
        Box(
            modifier = Modifier
                .width(80.dp)
                .height(podiumHeight.dp)
                .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                .background(medalColor.copy(alpha = 0.3f)),
            contentAlignment = Alignment.TopCenter,
        ) {
            Column(
                modifier = Modifier.padding(top = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = Icons.Default.EmojiEvents,
                    contentDescription = null,
                    tint = medalColor,
                    modifier = Modifier.size(24.dp),
                )
                Text(
                    text = "#$rank",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    color = medalColor,
                )
            }
        }
    }
}

// ── Row Item ────────────────────────────────────────────────────────────────

@Composable
private fun LeaderboardRow(
    rank: Int,
    entry: LeaderboardEntry,
    isCurrentUser: Boolean,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (isCurrentUser) {
                    Modifier.border(
                        2.dp,
                        MaterialTheme.colorScheme.primary,
                        RoundedCornerShape(12.dp),
                    )
                } else {
                    Modifier
                }
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrentUser) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Rank
            Text(
                text = "#$rank",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(48.dp),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            // Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        if (isCurrentUser) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        }
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = entry.displayName.take(2).uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Name
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = entry.displayName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isCurrentUser) FontWeight.Bold else FontWeight.Normal,
                    )
                    if (isCurrentUser) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "YOU",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.primary)
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                Text(
                    text = entry.tier.displayName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
            }

            // Points
            Text(
                text = "${entry.score}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "pts",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
            )
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────────

private fun previewLeaderboard() = listOf(
    LeaderboardEntry(id = "1", userID = "1", displayName = "Sarah M.", score = 2450, rank = 1, tier = Tier.ALL_STAR),
    LeaderboardEntry(id = "2", userID = "2", displayName = "Jake T.", score = 2100, rank = 2, tier = Tier.ALL_STAR),
    LeaderboardEntry(id = "3", userID = "3", displayName = "Emily R.", score = 1890, rank = 3, tier = Tier.STARTER),
    LeaderboardEntry(id = "4", userID = "current", displayName = "You", score = 1750, rank = 4, tier = Tier.STARTER),
    LeaderboardEntry(id = "5", userID = "5", displayName = "Mike D.", score = 1620, rank = 5, tier = Tier.STARTER),
    LeaderboardEntry(id = "6", userID = "6", displayName = "Alex K.", score = 1400, rank = 6, tier = Tier.STARTER),
    LeaderboardEntry(id = "7", userID = "7", displayName = "Jordan P.", score = 1200, rank = 7, tier = Tier.ROOKIE),
    LeaderboardEntry(id = "8", userID = "8", displayName = "Taylor W.", score = 950, rank = 8, tier = Tier.ROOKIE),
)

@Preview(showBackground = true)
@Composable
private fun LeaderboardPreview() {
    MaterialTheme {
        LeaderboardContent(
            entries = previewLeaderboard(),
            currentUserId = "current",
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun LeaderboardEmptyPreview() {
    MaterialTheme {
        LeaderboardContent(
            entries = emptyList(),
            currentUserId = "",
        )
    }
}
