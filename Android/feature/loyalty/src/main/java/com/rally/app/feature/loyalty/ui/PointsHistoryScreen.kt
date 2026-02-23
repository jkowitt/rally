package com.rally.app.feature.loyalty.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.SportsScore
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rally.app.core.model.PointsTransaction
import com.rally.app.feature.loyalty.viewmodel.PointsHistoryViewModel
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// ---- Brand palette --------------------------------------------------------------

private val RallyOrange = Color(0xFFFF6B35)
private val Navy = Color(0xFF131B2E)
private val NavyMid = Color(0xFF1C2842)
private val Blue = Color(0xFF2D9CDB)
private val OffWhite = Color(0xFFF5F7FA)
private val Gray = Color(0xFF8B95A5)
private val GreenEarned = Color(0xFF27AE60)
private val RedRedeemed = Color(0xFFEB5757)

// ---- Screen ---------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PointsHistoryScreen(
    onNavigateBack: () -> Unit,
    viewModel: PointsHistoryViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    // Group transactions by date
    val groupedTransactions = remember(state.transactions) {
        state.transactions
            .groupBy { transaction ->
                transaction.timestamp
                    .toInstant()
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate()
            }
            .toSortedMap(compareByDescending { it })
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Points History", color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy),
            )
        },
        containerColor = OffWhite,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = { viewModel.loadHistory() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // --- Total points header ---
                item {
                    TotalPointsHeader(totalPoints = state.totalPoints)
                }

                // --- Filter chips ---
                item {
                    TransactionFilterRow(
                        selected = state.selectedFilter,
                        onSelect = { viewModel.setFilter(it) },
                    )
                }

                // --- Grouped transaction list ---
                groupedTransactions.forEach { (date, transactions) ->
                    item {
                        DateHeader(date = date)
                    }

                    items(
                        items = transactions,
                        key = { it.id },
                    ) { transaction ->
                        TransactionRow(transaction = transaction)
                    }
                }

                // --- Empty state ---
                if (state.transactions.isEmpty() && !state.isLoading) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = Gray.copy(alpha = 0.5f),
                                    modifier = Modifier.size(48.dp),
                                )
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    text = "No transactions yet",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = Gray,
                                )
                                Text(
                                    text = "Start earning points by checking in at events!",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Gray.copy(alpha = 0.7f),
                                )
                            }
                        }
                    }
                }
            }

            // Loading overlay for initial load
            AnimatedVisibility(
                visible = state.isLoading && state.transactions.isEmpty(),
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = RallyOrange)
                }
            }
        }
    }
}

// ---- Composable components ------------------------------------------------------

@Composable
private fun TotalPointsHeader(totalPoints: Int) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NavyMid),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = null,
                tint = RallyOrange,
                modifier = Modifier.size(32.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    text = "Total Points",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray,
                )
                Text(
                    text = "$totalPoints",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }
        }
    }
}

@Composable
private fun TransactionFilterRow(
    selected: PointsHistoryViewModel.TransactionFilter,
    onSelect: (PointsHistoryViewModel.TransactionFilter) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(vertical = 8.dp),
    ) {
        items(PointsHistoryViewModel.TransactionFilter.entries.toList()) { filter ->
            FilterChip(
                selected = filter == selected,
                onClick = { onSelect(filter) },
                label = { Text(filter.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = RallyOrange,
                    selectedLabelColor = Color.White,
                    containerColor = Color.White,
                    labelColor = Navy,
                ),
            )
        }
    }
}

@Composable
private fun DateHeader(date: LocalDate) {
    val formatter = remember { DateTimeFormatter.ofPattern("MMMM d, yyyy") }
    val today = remember { LocalDate.now() }
    val yesterday = remember { today.minusDays(1) }

    val label = when (date) {
        today -> "Today"
        yesterday -> "Yesterday"
        else -> date.format(formatter)
    }

    Text(
        text = label,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = Navy,
        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
    )
}

@Composable
private fun TransactionRow(transaction: PointsTransaction) {
    val isEarned = transaction.amount > 0
    val icon = resolveTransactionIcon(transaction.source)
    val iconColor = if (isEarned) GreenEarned else RedRedeemed
    val timeFormatter = remember { DateTimeFormatter.ofPattern("h:mm a") }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(iconColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp),
                )
            }

            Spacer(Modifier.width(12.dp))

            // Description & timestamp
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = Navy,
                )
                Text(
                    text = transaction.timestamp
                        .toInstant()
                        .atZone(ZoneId.systemDefault())
                        .format(timeFormatter),
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray,
                )
            }

            // Points amount
            Text(
                text = if (isEarned) "+${transaction.amount}" else "${transaction.amount}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = iconColor,
            )
        }
    }
}

/**
 * Maps a transaction source tag to an appropriate Material icon.
 */
private fun resolveTransactionIcon(source: String): ImageVector = when {
    source.contains("checkin", ignoreCase = true) -> Icons.Default.CheckCircle
    source.contains("prediction", ignoreCase = true) -> Icons.Default.SportsScore
    source.contains("redeem", ignoreCase = true) -> Icons.Default.CardGiftcard
    source.contains("reward", ignoreCase = true) -> Icons.Default.CardGiftcard
    source.contains("trivia", ignoreCase = true) -> Icons.Default.EmojiEvents
    source.contains("bonus", ignoreCase = true) -> Icons.Default.Star
    else -> if (source.contains("redeem", ignoreCase = true)) Icons.Default.Remove else Icons.Default.Add
}
