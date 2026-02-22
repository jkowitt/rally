package com.vanwagner.rally.feature.loyalty.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.text.style.TextAlign
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

// ---- Screen ---------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardDetailScreen(
    reward: Reward,
    onNavigateBack: () -> Unit,
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var showConfirmDialog by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }

    val canAfford = state.currentPoints >= reward.pointsCost

    // Observe redemption result
    LaunchedEffect(state.redemptionResult) {
        when (state.redemptionResult) {
            is RewardsViewModel.RedemptionResult.Success -> {
                showConfirmDialog = false
                showSuccessDialog = true
                viewModel.clearRedemptionResult()
            }
            is RewardsViewModel.RedemptionResult.Failure -> {
                showConfirmDialog = false
                viewModel.clearRedemptionResult()
            }
            null -> { /* no-op */ }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reward Details", color = Color.White) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            // --- Hero image ---
            AsyncImage(
                model = reward.imageURL,
                contentDescription = reward.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp),
            )

            Column(
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            ) {
                // --- Category label ---
                Text(
                    text = reward.category.displayName.uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    color = Blue,
                    fontWeight = FontWeight.Bold,
                )

                Spacer(Modifier.height(8.dp))

                // --- Reward name ---
                Text(
                    text = reward.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Navy,
                )

                Spacer(Modifier.height(16.dp))

                // --- Points cost card ---
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavyMid),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = RallyOrange,
                                modifier = Modifier.size(24.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = "${reward.pointsCost} points",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                        }
                        Text(
                            text = "You have ${state.currentPoints} pts",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray,
                        )
                    }
                }

                Spacer(Modifier.height(20.dp))

                // --- Description ---
                Text(
                    text = "Description",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Navy,
                )

                Spacer(Modifier.height(8.dp))

                Text(
                    text = reward.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Gray,
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight,
                )

                Spacer(Modifier.height(32.dp))

                // --- Redeem button ---
                Button(
                    onClick = { showConfirmDialog = true },
                    enabled = canAfford && !state.isLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RallyOrange,
                        contentColor = Color.White,
                        disabledContainerColor = Gray.copy(alpha = 0.3f),
                        disabledContentColor = Gray,
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                ) {
                    Text(
                        text = if (canAfford) "Redeem Reward" else "Not Enough Points",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }

                if (!canAfford) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "You need ${reward.pointsCost - state.currentPoints} more points",
                        style = MaterialTheme.typography.bodySmall,
                        color = RallyOrange,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }

    // ---- Confirmation dialog ----------------------------------------------------

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            containerColor = Color.White,
            title = {
                Text(
                    text = "Confirm Redemption",
                    fontWeight = FontWeight.Bold,
                    color = Navy,
                )
            },
            text = {
                Column {
                    Text(
                        text = "Redeem \"${reward.title}\" for ${reward.pointsCost} points?",
                        color = Navy,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Your balance after: ${state.currentPoints - reward.pointsCost} pts",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray,
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.redeemReward(reward) },
                    colors = ButtonDefaults.buttonColors(containerColor = RallyOrange),
                ) {
                    Text("Confirm", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("Cancel", color = Gray)
                }
            },
        )
    }

    // ---- Success dialog ---------------------------------------------------------

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                onNavigateBack()
            },
            containerColor = Color.White,
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Blue,
                    modifier = Modifier.size(48.dp),
                )
            },
            title = {
                Text(
                    text = "Reward Redeemed!",
                    fontWeight = FontWeight.Bold,
                    color = Navy,
                )
            },
            text = {
                Text(
                    text = "You have successfully redeemed \"${reward.title}\". Check your email for redemption details.",
                    textAlign = TextAlign.Center,
                    color = Gray,
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSuccessDialog = false
                        onNavigateBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RallyOrange),
                ) {
                    Text("Done", color = Color.White)
                }
            },
        )
    }
}
