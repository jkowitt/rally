package com.vanwagner.rally.feature.gameday.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.RadioButtonUnchecked
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
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.vanwagner.rally.core.model.PredictionOption
import kotlinx.coroutines.delay

// ── State ───────────────────────────────────────────────────────────────────

private enum class PredictionPhase {
    SELECTING,
    SUBMITTED,
    RESULT_REVEALED,
}

// ── Screen ──────────────────────────────────────────────────────────────────

@Composable
fun PredictionScreen(
    activationId: String = "",
    question: String = "Who will score the next touchdown?",
    options: List<PredictionOption> = emptyList(),
    onSubmit: (String, String) -> Unit = { _, _ -> },
    onNavigateBack: () -> Unit = {},
) {
    var selectedOptionId by remember { mutableStateOf<String?>(null) }
    var phase by remember { mutableStateOf(PredictionPhase.SELECTING) }
    var correctOptionId by remember { mutableStateOf<String?>(null) }
    var pointsEarned by remember { mutableIntStateOf(0) }
    var showPointsAnimation by remember { mutableStateOf(false) }

    PredictionContent(
        question = question,
        options = options,
        selectedOptionId = selectedOptionId,
        correctOptionId = correctOptionId,
        phase = phase,
        pointsEarned = pointsEarned,
        showPointsAnimation = showPointsAnimation,
        onOptionSelected = { optionId ->
            if (phase == PredictionPhase.SELECTING) {
                selectedOptionId = optionId
            }
        },
        onSubmit = {
            if (selectedOptionId != null && phase == PredictionPhase.SELECTING) {
                phase = PredictionPhase.SUBMITTED
                onSubmit(activationId, selectedOptionId!!)
            }
        },
        onNavigateBack = onNavigateBack,
        onRevealResult = { correct, points ->
            correctOptionId = correct
            pointsEarned = points
            phase = PredictionPhase.RESULT_REVEALED
            showPointsAnimation = true
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PredictionContent(
    question: String,
    options: List<PredictionOption>,
    selectedOptionId: String?,
    correctOptionId: String?,
    phase: PredictionPhase,
    pointsEarned: Int,
    showPointsAnimation: Boolean,
    onOptionSelected: (String) -> Unit = {},
    onSubmit: () -> Unit = {},
    onNavigateBack: () -> Unit = {},
    onRevealResult: (String, Int) -> Unit = { _, _ -> },
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Prediction") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Question Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        imageVector = Icons.Default.EmojiEvents,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = question,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Options
            options.forEach { option ->
                val isSelected = selectedOptionId == option.id
                val isCorrect = correctOptionId == option.id
                val isRevealed = phase == PredictionPhase.RESULT_REVEALED

                val backgroundColor = when {
                    isRevealed && isCorrect -> MaterialTheme.colorScheme.primaryContainer
                    isRevealed && isSelected && !isCorrect ->
                        MaterialTheme.colorScheme.errorContainer
                    isSelected -> MaterialTheme.colorScheme.secondaryContainer
                    else -> MaterialTheme.colorScheme.surface
                }

                val borderColor = when {
                    isRevealed && isCorrect -> MaterialTheme.colorScheme.primary
                    isRevealed && isSelected && !isCorrect -> MaterialTheme.colorScheme.error
                    isSelected -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .border(
                            width = 2.dp,
                            color = borderColor,
                            shape = RoundedCornerShape(12.dp),
                        )
                        .clickable(enabled = phase == PredictionPhase.SELECTING) {
                            onOptionSelected(option.id)
                        },
                    colors = CardDefaults.cardColors(containerColor = backgroundColor),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = if (isSelected || (isRevealed && isCorrect)) {
                                Icons.Default.CheckCircle
                            } else {
                                Icons.Default.RadioButtonUnchecked
                            },
                            contentDescription = null,
                            tint = when {
                                isRevealed && isCorrect -> MaterialTheme.colorScheme.primary
                                isSelected -> MaterialTheme.colorScheme.primary
                                else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                            },
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = option.text,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = if (isSelected || isCorrect) {
                                FontWeight.SemiBold
                            } else {
                                FontWeight.Normal
                            },
                            modifier = Modifier.weight(1f),
                        )
                        if (isRevealed && isCorrect) {
                            Text(
                                text = "Correct",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Submit Button
            when (phase) {
                PredictionPhase.SELECTING -> {
                    Button(
                        onClick = onSubmit,
                        enabled = selectedOptionId != null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Text(
                            text = "Lock In Prediction",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                PredictionPhase.SUBMITTED -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "Prediction Locked!",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Results will be revealed soon...",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                                    .copy(alpha = 0.7f),
                            )
                        }
                    }
                }
                PredictionPhase.RESULT_REVEALED -> {
                    PointsRevealAnimation(
                        pointsEarned = pointsEarned,
                        isCorrect = selectedOptionId == correctOptionId,
                        visible = showPointsAnimation,
                    )
                }
            }
        }
    }
}

@Composable
private fun PointsRevealAnimation(
    pointsEarned: Int,
    isCorrect: Boolean,
    visible: Boolean,
) {
    val scale = remember { Animatable(0f) }

    LaunchedEffect(visible) {
        if (visible) {
            scale.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = 500,
                    easing = FastOutSlowInEasing,
                ),
            )
        }
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(300)) + slideInVertically(tween(400)) { it / 2 },
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .scale(scale.value),
            colors = CardDefaults.cardColors(
                containerColor = if (isCorrect) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
            ),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = if (isCorrect) "Nice Call!" else "Better Luck Next Time",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = if (isCorrect) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = if (isCorrect) "+$pointsEarned pts" else "+${pointsEarned / 2} pts (participation)",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────────

private val previewOptions = listOf(
    PredictionOption(id = "1", text = "Marcus Johnson - QB"),
    PredictionOption(id = "2", text = "Tyler Williams - WR"),
    PredictionOption(id = "3", text = "DeShawn Harris - RB"),
    PredictionOption(id = "4", text = "Jake Anderson - TE"),
)

@Preview(showBackground = true)
@Composable
private fun PredictionSelectingPreview() {
    MaterialTheme {
        PredictionContent(
            question = "Who will score the next touchdown?",
            options = previewOptions,
            selectedOptionId = "2",
            correctOptionId = null,
            phase = PredictionPhase.SELECTING,
            pointsEarned = 0,
            showPointsAnimation = false,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PredictionSubmittedPreview() {
    MaterialTheme {
        PredictionContent(
            question = "Who will score the next touchdown?",
            options = previewOptions,
            selectedOptionId = "2",
            correctOptionId = null,
            phase = PredictionPhase.SUBMITTED,
            pointsEarned = 0,
            showPointsAnimation = false,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PredictionRevealedCorrectPreview() {
    MaterialTheme {
        PredictionContent(
            question = "Who will score the next touchdown?",
            options = previewOptions,
            selectedOptionId = "2",
            correctOptionId = "2",
            phase = PredictionPhase.RESULT_REVEALED,
            pointsEarned = 50,
            showPointsAnimation = true,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PredictionRevealedWrongPreview() {
    MaterialTheme {
        PredictionContent(
            question = "Who will score the next touchdown?",
            options = previewOptions,
            selectedOptionId = "2",
            correctOptionId = "3",
            phase = PredictionPhase.RESULT_REVEALED,
            pointsEarned = 50,
            showPointsAnimation = true,
        )
    }
}
