package com.vanwagner.rally.feature.loyalty.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.vanwagner.rally.core.model.Reward
import com.vanwagner.rally.feature.loyalty.viewmodel.RewardsViewModel

// ---- Brand palette --------------------------------------------------------------

private val RallyOrange = Color(0xFFFF6B35)
private val Navy = Color(0xFF131B2E)
private val NavyMid = Color(0xFF1C2842)
private val Blue = Color(0xFF2D9CDB)
private val OffWhite = Color(0xFFF5F7FA)
private val Gray = Color(0xFF8B95A5)

// ---- Reward categories ----------------------------------------------------------

private enum class RewardCategory(val label: String) {
    All("All"),
    Food("Food"),
    Merch("Merch"),
    Experience("Experience"),
    Exclusive("Exclusive"),
}

// ---- Screen ---------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardsCatalogScreen(
    onRewardClick: (Reward) -> Unit,
    onNavigateToHistory: () -> Unit = {},
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedCategory by remember { mutableStateOf(RewardCategory.All) }

    // Show error as snackbar
    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    val filteredRewards = remember(state.rewards, selectedCategory) {
        if (selectedCategory == RewardCategory.All) {
            state.rewards
        } else {
            state.rewards.filter {
                it.category.equals(selectedCategory.label, ignoreCase = true)
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Rewards", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Navy),
            )
        },
        containerColor = OffWhite,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = { viewModel.loadRewards() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // --- Points balance header (full-width) ---
                item(span = { GridItemSpan(maxLineSpan) }) {
                    PointsBalanceHeader(
                        points = state.currentPoints,
                        tier = state.currentTier.name,
                    )
                }

                // --- Category filter chips (full-width) ---
                item(span = { GridItemSpan(maxLineSpan) }) {
                    CategoryFilterRow(
                        selected = selectedCategory,
                        onSelect = { selectedCategory = it },
                    )
                }

                // --- Reward cards ---
                items(
                    items = filteredRewards,
                    key = { it.id },
                ) { reward ->
                    RewardCard(
                        reward = reward,
                        currentPoints = state.currentPoints,
                        onClick = { onRewardClick(reward) },
                    )
                }

                // --- Empty state ---
                if (filteredRewards.isEmpty() && !state.isLoading) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "No rewards available in this category",
                                color = Gray,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                        }
                    }
                }
            }

            // Loading overlay for initial load
            AnimatedVisibility(
                visible = state.isLoading && state.rewards.isEmpty(),
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
private fun PointsBalanceHeader(
    points: Int,
    tier: String,
) {
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
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "$points pts",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Text(
                    text = tier,
                    style = MaterialTheme.typography.bodyMedium,
                    color = RallyOrange,
                )
            }
        }
    }
}

@Composable
private fun CategoryFilterRow(
    selected: RewardCategory,
    onSelect: (RewardCategory) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(vertical = 4.dp),
    ) {
        items(RewardCategory.entries.toList()) { category ->
            FilterChip(
                selected = category == selected,
                onClick = { onSelect(category) },
                label = { Text(category.label) },
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
private fun RewardCard(
    reward: Reward,
    currentPoints: Int,
    onClick: () -> Unit,
) {
    val affordable = currentPoints >= reward.pointsCost

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Column {
            // Reward image
            AsyncImage(
                model = reward.imageUrl,
                contentDescription = reward.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
            )

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = reward.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Navy,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    text = reward.category,
                    style = MaterialTheme.typography.labelSmall,
                    color = Gray,
                )

                Spacer(Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = if (affordable) RallyOrange else Gray,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = "${reward.pointsCost} pts",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (affordable) RallyOrange else Gray,
                    )
                }
            }
        }
    }
}
