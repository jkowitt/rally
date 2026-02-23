package com.rally.app.feature.loyalty.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rally.app.core.model.Tier
import com.rally.app.feature.loyalty.viewmodel.RewardsViewModel

// ---- Brand palette --------------------------------------------------------------

private val RallyOrange = Color(0xFFFF6B35)
private val Navy = Color(0xFF131B2E)
private val NavyMid = Color(0xFF1C2842)
private val Blue = Color(0xFF2D9CDB)
private val OffWhite = Color(0xFFF5F7FA)
private val Gray = Color(0xFF8B95A5)

// ---- Tier metadata --------------------------------------------------------------

private data class TierInfo(
    val tier: Tier,
    val threshold: Int,
    val benefits: List<String>,
)

private val tierInfoList = listOf(
    TierInfo(
        tier = Tier.Rookie,
        threshold = 0,
        benefits = listOf(
            "Access to rewards catalog",
            "Earn points for check-ins",
            "Weekly fan challenges",
        ),
    ),
    TierInfo(
        tier = Tier.Starter,
        threshold = 500,
        benefits = listOf(
            "All Rookie benefits",
            "2x points on gameday",
            "Exclusive Starter merch deals",
            "Early access to predictions",
        ),
    ),
    TierInfo(
        tier = Tier.AllStar,
        threshold = 2_000,
        benefits = listOf(
            "All Starter benefits",
            "3x points on gameday",
            "Priority food & beverage lines",
            "Exclusive behind-the-scenes content",
            "AllStar badge on profile",
        ),
    ),
    TierInfo(
        tier = Tier.MVP,
        threshold = 5_000,
        benefits = listOf(
            "All AllStar benefits",
            "5x points on gameday",
            "VIP parking access",
            "Meet & greet opportunities",
            "MVP-only merchandise drops",
            "Priority customer support",
        ),
    ),
    TierInfo(
        tier = Tier.HallOfFame,
        threshold = 15_000,
        benefits = listOf(
            "All MVP benefits",
            "10x points on gameday",
            "Complimentary season upgrade",
            "Sideline experience passes",
            "Exclusive HallOfFame events",
            "Personal concierge service",
            "Legacy plaque recognition",
        ),
    ),
)

// ---- Screen ---------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TierProgressScreen(
    onNavigateBack: () -> Unit,
    viewModel: RewardsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    val currentTier = state.currentTier
    val currentPoints = state.currentPoints
    val currentTierInfo = tierInfoList.first { it.tier == currentTier }
    val nextTierInfo = tierInfoList.getOrNull(tierInfoList.indexOf(currentTierInfo) + 1)

    // Animated progress
    val targetProgress = if (nextTierInfo != null) {
        val rangeStart = currentTierInfo.threshold
        val rangeEnd = nextTierInfo.threshold
        ((currentPoints - rangeStart).toFloat() / (rangeEnd - rangeStart).toFloat()).coerceIn(0f, 1f)
    } else {
        1f // Max tier
    }

    var animatedTarget by remember { mutableFloatStateOf(0f) }
    val animatedProgress by animateFloatAsState(
        targetValue = animatedTarget,
        animationSpec = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
        label = "tierProgress",
    )

    LaunchedEffect(targetProgress) {
        animatedTarget = targetProgress
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tier Progress", color = Color.White) },
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
            // --- Current tier hero ---
            CurrentTierHeader(
                tier = currentTier,
                points = currentPoints,
                progress = animatedProgress,
                nextTier = nextTierInfo,
            )

            Spacer(Modifier.height(24.dp))

            // --- Tier benefits list ---
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Text(
                    text = "Tier Benefits",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Navy,
                )

                Spacer(Modifier.height(16.dp))

                tierInfoList.forEach { info ->
                    val isUnlocked = currentPoints >= info.threshold
                    val isCurrent = info.tier == currentTier

                    TierBenefitCard(
                        tierInfo = info,
                        isUnlocked = isUnlocked,
                        isCurrent = isCurrent,
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

// ---- Composable components ------------------------------------------------------

@Composable
private fun CurrentTierHeader(
    tier: Tier,
    points: Int,
    progress: Float,
    nextTier: TierInfo?,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(NavyMid, Navy),
                )
            )
            .padding(24.dp),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth(),
        ) {
            // Tier badge
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(RallyOrange.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = RallyOrange,
                    modifier = Modifier.size(40.dp),
                )
            }

            Spacer(Modifier.height(12.dp))

            Text(
                text = tier.name,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "$points total points",
                style = MaterialTheme.typography.bodyLarge,
                color = Gray,
            )

            if (nextTier != null) {
                Spacer(Modifier.height(20.dp))

                // Progress bar
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(5.dp)),
                    color = RallyOrange,
                    trackColor = Color.White.copy(alpha = 0.15f),
                    strokeCap = StrokeCap.Round,
                )

                Spacer(Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = tier.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = Gray,
                    )
                    Text(
                        text = nextTier.tier.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = Gray,
                    )
                }

                Spacer(Modifier.height(12.dp))

                val pointsNeeded = nextTier.threshold - points
                Text(
                    text = "$pointsNeeded points to ${nextTier.tier.name}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Blue,
                    textAlign = TextAlign.Center,
                )
            } else {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = "Maximum tier reached!",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = RallyOrange,
                )
            }
        }
    }
}

@Composable
private fun TierBenefitCard(
    tierInfo: TierInfo,
    isUnlocked: Boolean,
    isCurrent: Boolean,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrent) NavyMid else Color.White,
        ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isCurrent) 4.dp else 1.dp,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(
                    imageVector = if (isUnlocked) Icons.Default.CheckCircle else Icons.Default.Lock,
                    contentDescription = null,
                    tint = when {
                        isCurrent -> RallyOrange
                        isUnlocked -> Blue
                        else -> Gray.copy(alpha = 0.5f)
                    },
                    modifier = Modifier.size(24.dp),
                )

                Spacer(Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = tierInfo.tier.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (isCurrent) Color.White else if (isUnlocked) Navy else Gray,
                    )
                    Text(
                        text = "${tierInfo.threshold} points",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrent) Gray else Gray.copy(alpha = 0.7f),
                    )
                }

                if (isCurrent) {
                    Text(
                        text = "CURRENT",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = RallyOrange,
                        modifier = Modifier
                            .background(
                                RallyOrange.copy(alpha = 0.15f),
                                RoundedCornerShape(4.dp),
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            tierInfo.benefits.forEach { benefit ->
                Row(
                    modifier = Modifier.padding(vertical = 2.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(
                        text = "\u2022",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrent) Gray else if (isUnlocked) Navy.copy(alpha = 0.7f) else Gray.copy(alpha = 0.5f),
                        modifier = Modifier.width(16.dp),
                    )
                    Text(
                        text = benefit,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrent) Color.White.copy(alpha = 0.85f)
                        else if (isUnlocked) Navy.copy(alpha = 0.7f)
                        else Gray.copy(alpha = 0.5f),
                    )
                }
            }
        }
    }
}
