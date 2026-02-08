package com.vanwagner.rally.feature.gameday.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayEvent
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayViewModel
import kotlinx.coroutines.delay

// ── Check-In Step Model ─────────────────────────────────────────────────────

private enum class CheckInStep {
    VERIFYING_LOCATION,
    DETECTING_BEACON,
    CONFIRMING_GPS,
    SUCCESS,
    FAILED,
}

// ── Screen ──────────────────────────────────────────────────────────────────

@Composable
fun CheckInScreen(
    onNavigateBack: () -> Unit = {},
    onCheckInComplete: () -> Unit = {},
    viewModel: GamedayViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentStep by remember { mutableStateOf(CheckInStep.VERIFYING_LOCATION) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is GamedayEvent.CheckInSuccess -> {
                    currentStep = CheckInStep.SUCCESS
                    delay(2500)
                    onCheckInComplete()
                }
                is GamedayEvent.Error -> {
                    currentStep = CheckInStep.FAILED
                    errorMessage = event.message
                }
                else -> {}
            }
        }
    }

    // Simulate step progression for location verification flow
    LaunchedEffect(currentStep) {
        when (currentStep) {
            CheckInStep.VERIFYING_LOCATION -> {
                delay(1500)
                currentStep = CheckInStep.DETECTING_BEACON
            }
            CheckInStep.DETECTING_BEACON -> {
                delay(2000)
                currentStep = CheckInStep.CONFIRMING_GPS
            }
            CheckInStep.CONFIRMING_GPS -> {
                viewModel.performCheckIn()
            }
            else -> {}
        }
    }

    CheckInContent(
        currentStep = currentStep,
        errorMessage = errorMessage,
        onNavigateBack = onNavigateBack,
        onRetry = {
            errorMessage = null
            currentStep = CheckInStep.VERIFYING_LOCATION
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CheckInContent(
    currentStep: CheckInStep,
    errorMessage: String? = null,
    onNavigateBack: () -> Unit = {},
    onRetry: () -> Unit = {},
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Check In") },
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
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    (fadeIn(tween(300)) + scaleIn(tween(300)))
                        .togetherWith(fadeOut(tween(200)))
                },
                label = "check_in_step",
            ) { step ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    when (step) {
                        CheckInStep.VERIFYING_LOCATION -> {
                            PulsingIcon(
                                icon = Icons.Default.LocationOn,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(
                                text = "Verifying Location",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Checking that you are at the venue...",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            CircularProgressIndicator()
                        }
                        CheckInStep.DETECTING_BEACON -> {
                            PulsingIcon(
                                icon = Icons.Default.Bluetooth,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(
                                text = "Detecting Beacons",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Scanning for venue beacons nearby...",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            CircularProgressIndicator(
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        }
                        CheckInStep.CONFIRMING_GPS -> {
                            PulsingIcon(
                                icon = Icons.Default.MyLocation,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(
                                text = "Confirming GPS",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Finalizing your location proof...",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            CircularProgressIndicator(
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                        CheckInStep.SUCCESS -> {
                            SuccessAnimation()
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(
                                text = "You're In!",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Check-in confirmed. Enjoy the game!",
                                style = MaterialTheme.typography.bodyLarge,
                                textAlign = TextAlign.Center,
                            )
                        }
                        CheckInStep.FAILED -> {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(80.dp),
                                tint = MaterialTheme.colorScheme.error,
                            )
                            Spacer(modifier = Modifier.height(32.dp))
                            Text(
                                text = "Check-In Failed",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = errorMessage ?: "Unable to verify your location.",
                                style = MaterialTheme.typography.bodyMedium,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = onRetry,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                ),
                            ) {
                                Text("Try Again")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PulsingIcon(
    icon: ImageVector,
    color: Color,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulse_scale",
    )
    val ringAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "ring_alpha",
    )
    val ringScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "ring_scale",
    )

    Box(contentAlignment = Alignment.Center) {
        // Expanding ring
        Canvas(modifier = Modifier.size(120.dp)) {
            drawCircle(
                color = color.copy(alpha = ringAlpha),
                radius = (size.minDimension / 2) * ringScale * 0.5f,
                style = Stroke(width = 3.dp.toPx()),
            )
        }
        // Pulsing icon
        Box(
            modifier = Modifier
                .size(80.dp)
                .scale(scale)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = color,
            )
        }
    }
}

@Composable
private fun SuccessAnimation() {
    val scale = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = 600,
                easing = FastOutSlowInEasing,
            ),
        )
    }

    Box(
        modifier = Modifier
            .size(120.dp)
            .scale(scale.value)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "Success",
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
    }
}

// ── Previews ────────────────────────────────────────────────────────────────

@Preview(showBackground = true)
@Composable
private fun CheckInVerifyingPreview() {
    MaterialTheme {
        CheckInContent(currentStep = CheckInStep.VERIFYING_LOCATION)
    }
}

@Preview(showBackground = true)
@Composable
private fun CheckInBeaconPreview() {
    MaterialTheme {
        CheckInContent(currentStep = CheckInStep.DETECTING_BEACON)
    }
}

@Preview(showBackground = true)
@Composable
private fun CheckInGpsPreview() {
    MaterialTheme {
        CheckInContent(currentStep = CheckInStep.CONFIRMING_GPS)
    }
}

@Preview(showBackground = true)
@Composable
private fun CheckInSuccessPreview() {
    MaterialTheme {
        CheckInContent(currentStep = CheckInStep.SUCCESS)
    }
}

@Preview(showBackground = true)
@Composable
private fun CheckInFailedPreview() {
    MaterialTheme {
        CheckInContent(
            currentStep = CheckInStep.FAILED,
            errorMessage = "Unable to verify your location. Make sure GPS is enabled.",
        )
    }
}
