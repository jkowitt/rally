package com.vanwagner.rally.feature.gameday.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vanwagner.rally.core.model.Activation
import com.vanwagner.rally.core.model.ActivationStatus
import com.vanwagner.rally.core.model.ActivationType
import com.vanwagner.rally.core.model.Event
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayEvent
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayUiState
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayViewModel

@Composable
fun GamedayScreen(
    onNavigateToCheckIn: () -> Unit = {},
    onNavigateToPrediction: (String) -> Unit = {},
    onNavigateToTrivia: (String) -> Unit = {},
    onNavigateToNoiseMeter: () -> Unit = {},
    onNavigateToLeaderboard: () -> Unit = {},
    viewModel: GamedayViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is GamedayEvent.NavigateToCheckIn -> onNavigateToCheckIn()
                is GamedayEvent.NavigateToPrediction -> onNavigateToPrediction(event.activationId)
                is GamedayEvent.NavigateToTrivia -> onNavigateToTrivia(event.activationId)
                is GamedayEvent.NavigateToNoiseMeter -> onNavigateToNoiseMeter()
                is GamedayEvent.NavigateToLeaderboard -> onNavigateToLeaderboard()
                else -> {}
            }
        }
    }

    GamedayContent(
        uiState = uiState,
        onCheckInTapped = viewModel::onCheckInTapped,
        onActivationTapped = viewModel::onActivationTapped,
        onLeaderboardTapped = viewModel::onLeaderboardTapped,
        onRefresh = viewModel::refresh,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GamedayContent(
    uiState: GamedayUiState,
    onCheckInTapped: () -> Unit = {},
    onActivationTapped: (Activation) -> Unit = {},
    onLeaderboardTapped: () -> Unit = {},
    onRefresh: () -> Unit = {},
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Gameday",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                },
                actions = {
                    IconButton(onClick = onLeaderboardTapped) {
                        Icon(
                            imageVector = Icons.Default.Leaderboard,
                            contentDescription = "Leaderboard",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
    ) { innerPadding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            if (uiState.isLoading && uiState.event == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null && uiState.event == null) {
                ErrorState(
                    message = uiState.error,
                    onRetry = onRefresh,
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Event Info Header
                    uiState.event?.let { event ->
                        item {
                            EventInfoCard(event = event)
                        }

                        // Score Display
                        item {
                            ScoreCard(event = event)
                        }
                    }

                    // Check-In CTA
                    item {
                        CheckInCard(
                            isCheckedIn = uiState.isCheckedIn,
                            points = uiState.checkInPoints,
                            onCheckIn = onCheckInTapped,
                        )
                    }

                    // Activations Header
                    if (uiState.activations.isNotEmpty()) {
                        item {
                            Text(
                                text = "Activations",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                    }

                    // Activations List
                    items(
                        items = uiState.activations,
                        key = { it.id },
                    ) { activation ->
                        ActivationCard(
                            activation = activation,
                            onClick = { onActivationTapped(activation) },
                        )
                    }

                    // Connection Status
                    item {
                        ConnectionStatusIndicator(
                            isConnected = uiState.webSocketConnected,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventInfoCard(event: Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = event.venue,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = event.formattedDate,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.6f),
            )
        }
    }
}

@Composable
private fun ScoreCard(event: Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Home Team
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = event.homeTeam,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${event.homeScore}",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            // VS / Period
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "VS",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
                Text(
                    text = event.period,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
            }

            // Away Team
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = event.awayTeam,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${event.awayScore}",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

@Composable
private fun CheckInCard(
    isCheckedIn: Boolean,
    points: Int,
    onCheckIn: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isCheckedIn) {
                MaterialTheme.colorScheme.tertiaryContainer
            } else {
                MaterialTheme.colorScheme.secondaryContainer
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (isCheckedIn) Icons.Default.CheckCircle else Icons.Default.LocationOn,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = if (isCheckedIn) {
                    MaterialTheme.colorScheme.onTertiaryContainer
                } else {
                    MaterialTheme.colorScheme.onSecondaryContainer
                },
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (isCheckedIn) "Checked In!" else "Check In Now",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = if (isCheckedIn) {
                        "+$points points earned"
                    } else {
                        "Verify your location to earn points"
                    },
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (!isCheckedIn) {
                Button(
                    onClick = onCheckIn,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                    ),
                ) {
                    Text("GO")
                }
            }
        }
    }
}

@Composable
private fun ActivationCard(
    activation: Activation,
    onClick: () -> Unit,
) {
    val isCompleted = activation.status == ActivationStatus.COMPLETED
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !isCompleted, onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isCompleted) {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isCompleted) 0.dp else 2.dp,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Type Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isCompleted) {
                            MaterialTheme.colorScheme.surfaceVariant
                        } else {
                            MaterialTheme.colorScheme.primaryContainer
                        }
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = activation.type.toIcon(),
                    contentDescription = null,
                    tint = if (isCompleted) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    },
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = activation.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = if (isCompleted) "Completed" else "+${activation.pointsValue} pts",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isCompleted) {
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    } else {
                        MaterialTheme.colorScheme.primary
                    },
                )
            }

            if (isCompleted) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Completed",
                    tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                )
            }
        }
    }
}

@Composable
private fun ConnectionStatusIndicator(isConnected: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(
                    if (isConnected) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.error
                    }
                ),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (isConnected) "Live" else "Reconnecting...",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        )
    }
}

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

private fun ActivationType.toIcon(): ImageVector = when (this) {
    ActivationType.PREDICTION -> Icons.Default.QuestionAnswer
    ActivationType.TRIVIA -> Icons.Default.Quiz
    ActivationType.NOISE_METER -> Icons.Default.MusicNote
    else -> Icons.Default.EmojiEvents
}

// ── Previews ────────────────────────────────────────────────────────────────

@Preview(showBackground = true)
@Composable
private fun GamedayContentPreview() {
    MaterialTheme {
        GamedayContent(
            uiState = GamedayUiState(
                event = previewEvent(),
                activations = previewActivations(),
                isCheckedIn = false,
                webSocketConnected = true,
            ),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun GamedayCheckedInPreview() {
    MaterialTheme {
        GamedayContent(
            uiState = GamedayUiState(
                event = previewEvent(),
                activations = previewActivations(),
                isCheckedIn = true,
                checkInPoints = 100,
                webSocketConnected = true,
            ),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun GamedayLoadingPreview() {
    MaterialTheme {
        GamedayContent(
            uiState = GamedayUiState(isLoading = true),
        )
    }
}

private fun previewEvent() = Event(
    id = "1",
    schoolID = "school1",
    sport = com.vanwagner.rally.core.model.Sport.FOOTBALL,
    title = "Wildcats vs Tigers",
    opponent = "Tigers",
    venueID = "venue1",
    startTime = System.currentTimeMillis(),
    venue = "Memorial Stadium",
    formattedDate = "Sat, Nov 15 - 3:30 PM",
    homeTeam = "Wildcats",
    awayTeam = "Tigers",
    homeScore = 21,
    awayScore = 14,
    period = "Q3 - 8:42",
)

private fun previewActivations() = listOf(
    Activation(
        id = "1",
        eventID = "1",
        title = "Halftime Prediction",
        type = ActivationType.PREDICTION,
        pointsValue = 50,
        status = ActivationStatus.ACTIVE,
    ),
    Activation(
        id = "2",
        eventID = "1",
        title = "Rally Trivia",
        type = ActivationType.TRIVIA,
        pointsValue = 75,
        status = ActivationStatus.ACTIVE,
    ),
    Activation(
        id = "3",
        eventID = "1",
        title = "Crowd Noise Challenge",
        type = ActivationType.NOISE_METER,
        pointsValue = 100,
        status = ActivationStatus.COMPLETED,
    ),
)
