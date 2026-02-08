package com.vanwagner.rally.feature.gameday.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Timer
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

// ── State ───────────────────────────────────────────────────────────────────

private enum class TriviaPhase {
    ANSWERING,
    CORRECT,
    INCORRECT,
    TIME_UP,
}

data class TriviaOption(
    val id: String,
    val text: String,
    val letter: Char,
)

// ── Screen ──────────────────────────────────────────────────────────────────

@Composable
fun TriviaScreen(
    activationId: String = "",
    question: String = "What year was the university founded?",
    options: List<TriviaOption> = emptyList(),
    correctOptionId: String = "",
    timeLimitSeconds: Int = 15,
    pointsValue: Int = 75,
    onSubmit: (String, String) -> Unit = { _, _ -> },
    onNavigateBack: () -> Unit = {},
) {
    var selectedOptionId by remember { mutableStateOf<String?>(null) }
    var phase by remember { mutableStateOf(TriviaPhase.ANSWERING) }
    var timeRemaining by remember { mutableIntStateOf(timeLimitSeconds) }
    var timerProgress by remember { mutableFloatStateOf(1f) }

    // Countdown timer
    LaunchedEffect(phase) {
        if (phase == TriviaPhase.ANSWERING) {
            val startTime = System.currentTimeMillis()
            val totalMs = timeLimitSeconds * 1000L
            while (timeRemaining > 0 && phase == TriviaPhase.ANSWERING) {
                delay(100)
                val elapsed = System.currentTimeMillis() - startTime
                val remaining = ((totalMs - elapsed) / 1000f).coerceAtLeast(0f)
                timeRemaining = remaining.toInt()
                timerProgress = (remaining / timeLimitSeconds).coerceIn(0f, 1f)
                if (remaining <= 0f) {
                    phase = TriviaPhase.TIME_UP
                }
            }
        }
    }

    TriviaContent(
        question = question,
        options = options,
        selectedOptionId = selectedOptionId,
        correctOptionId = correctOptionId,
        phase = phase,
        timeRemaining = timeRemaining,
        timerProgress = timerProgress,
        pointsValue = pointsValue,
        onOptionSelected = { optionId ->
            if (phase == TriviaPhase.ANSWERING) {
                selectedOptionId = optionId
                phase = if (optionId == correctOptionId) {
                    TriviaPhase.CORRECT
                } else {
                    TriviaPhase.INCORRECT
                }
                onSubmit(activationId, optionId)
            }
        },
        onNavigateBack = onNavigateBack,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TriviaContent(
    question: String,
    options: List<TriviaOption>,
    selectedOptionId: String?,
    correctOptionId: String,
    phase: TriviaPhase,
    timeRemaining: Int,
    timerProgress: Float,
    pointsValue: Int,
    onOptionSelected: (String) -> Unit = {},
    onNavigateBack: () -> Unit = {},
) {
    val animatedProgress by animateFloatAsState(
        targetValue = timerProgress,
        animationSpec = tween(100),
        label = "timer_progress",
    )

    val timerColor = when {
        timerProgress > 0.5f -> MaterialTheme.colorScheme.primary
        timerProgress > 0.25f -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.error
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Trivia") },
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
            // Timer Bar
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Timer,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = timerColor,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${timeRemaining}s",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = timerColor,
                        )
                    }
                    Text(
                        text = "+$pointsValue pts",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = timerColor,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    strokeCap = StrokeCap.Round,
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Question
            Text(
                text = question,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Options with letter badges
            options.forEach { option ->
                val isSelected = selectedOptionId == option.id
                val isCorrectOption = option.id == correctOptionId
                val isRevealed = phase != TriviaPhase.ANSWERING

                val backgroundColor = when {
                    isRevealed && isCorrectOption -> MaterialTheme.colorScheme.primaryContainer
                    isRevealed && isSelected && !isCorrectOption ->
                        MaterialTheme.colorScheme.errorContainer
                    else -> MaterialTheme.colorScheme.surface
                }

                val borderColor = when {
                    isRevealed && isCorrectOption -> MaterialTheme.colorScheme.primary
                    isRevealed && isSelected && !isCorrectOption -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                }

                val letterBgColor = when {
                    isRevealed && isCorrectOption -> MaterialTheme.colorScheme.primary
                    isRevealed && isSelected && !isCorrectOption -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.primaryContainer
                }

                val letterTextColor = when {
                    isRevealed && isCorrectOption -> MaterialTheme.colorScheme.onPrimary
                    isRevealed && isSelected && !isCorrectOption ->
                        MaterialTheme.colorScheme.onError
                    else -> MaterialTheme.colorScheme.onPrimaryContainer
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .border(2.dp, borderColor, RoundedCornerShape(12.dp))
                        .clickable(enabled = phase == TriviaPhase.ANSWERING) {
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
                        // Letter Badge
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(letterBgColor),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = option.letter.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = letterTextColor,
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Text(
                            text = option.text,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.weight(1f),
                            fontWeight = if (isSelected || isCorrectOption) {
                                FontWeight.SemiBold
                            } else {
                                FontWeight.Normal
                            },
                        )

                        // Result icon
                        if (isRevealed) {
                            if (isCorrectOption) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Correct",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            } else if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.Cancel,
                                    contentDescription = "Incorrect",
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Result Message
            AnimatedVisibility(
                visible = phase != TriviaPhase.ANSWERING,
                enter = fadeIn(tween(300)) + slideInVertically(tween(400)) { it / 2 },
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = when (phase) {
                            TriviaPhase.CORRECT -> MaterialTheme.colorScheme.primaryContainer
                            TriviaPhase.INCORRECT -> MaterialTheme.colorScheme.errorContainer
                            TriviaPhase.TIME_UP -> MaterialTheme.colorScheme.surfaceVariant
                            else -> MaterialTheme.colorScheme.surface
                        },
                    ),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = when (phase) {
                                TriviaPhase.CORRECT -> "Correct!"
                                TriviaPhase.INCORRECT -> "Wrong Answer"
                                TriviaPhase.TIME_UP -> "Time's Up!"
                                else -> ""
                            },
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Black,
                            color = when (phase) {
                                TriviaPhase.CORRECT ->
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                TriviaPhase.INCORRECT ->
                                    MaterialTheme.colorScheme.onErrorContainer
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = when (phase) {
                                TriviaPhase.CORRECT -> "+$pointsValue pts earned!"
                                TriviaPhase.INCORRECT -> "+${pointsValue / 4} pts (participation)"
                                TriviaPhase.TIME_UP -> "No points earned"
                                else -> ""
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────────

private val previewTriviaOptions = listOf(
    TriviaOption(id = "1", text = "1885", letter = 'A'),
    TriviaOption(id = "2", text = "1892", letter = 'B'),
    TriviaOption(id = "3", text = "1901", letter = 'C'),
    TriviaOption(id = "4", text = "1876", letter = 'D'),
)

@Preview(showBackground = true)
@Composable
private fun TriviaAnsweringPreview() {
    MaterialTheme {
        TriviaContent(
            question = "What year was the university founded?",
            options = previewTriviaOptions,
            selectedOptionId = null,
            correctOptionId = "2",
            phase = TriviaPhase.ANSWERING,
            timeRemaining = 12,
            timerProgress = 0.8f,
            pointsValue = 75,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TriviaCorrectPreview() {
    MaterialTheme {
        TriviaContent(
            question = "What year was the university founded?",
            options = previewTriviaOptions,
            selectedOptionId = "2",
            correctOptionId = "2",
            phase = TriviaPhase.CORRECT,
            timeRemaining = 8,
            timerProgress = 0.53f,
            pointsValue = 75,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TriviaIncorrectPreview() {
    MaterialTheme {
        TriviaContent(
            question = "What year was the university founded?",
            options = previewTriviaOptions,
            selectedOptionId = "3",
            correctOptionId = "2",
            phase = TriviaPhase.INCORRECT,
            timeRemaining = 5,
            timerProgress = 0.33f,
            pointsValue = 75,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TriviaTimeUpPreview() {
    MaterialTheme {
        TriviaContent(
            question = "What year was the university founded?",
            options = previewTriviaOptions,
            selectedOptionId = null,
            correctOptionId = "2",
            phase = TriviaPhase.TIME_UP,
            timeRemaining = 0,
            timerProgress = 0f,
            pointsValue = 75,
        )
    }
}
