package com.vanwagner.rally.feature.gameday.ui

import android.Manifest
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
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
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayUiState
import com.vanwagner.rally.feature.gameday.viewmodel.GamedayViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.log10
import kotlin.math.sqrt

// ── AudioRecord Constants ───────────────────────────────────────────────────

private const val SAMPLE_RATE = 44100
private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
private const val MAX_DB = 90.0  // Approximate max dB for mobile mic
private const val MIN_DB = 20.0  // Floor for ambient noise
private const val AUTO_STOP_SECONDS = 60

// ── Screen ──────────────────────────────────────────────────────────────────

@Composable
fun NoiseMeterScreen(
    onNavigateBack: () -> Unit = {},
    viewModel: GamedayViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()

    var isRecording by remember { mutableStateOf(false) }
    var audioRecord by remember { mutableStateOf<AudioRecord?>(null) }

    // Start/stop AudioRecord capture
    fun startRecording() {
        viewModel.startNoiseMeterTimer()
        isRecording = true

        scope.launch {
            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
                .coerceAtLeast(SAMPLE_RATE) // At least 1 second of buffer

            val recorder = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize,
            )
            audioRecord = recorder

            try {
                recorder.startRecording()
                val buffer = ShortArray(bufferSize / 2)

                withContext(Dispatchers.Default) {
                    while (isActive && isRecording) {
                        val readCount = recorder.read(buffer, 0, buffer.size)
                        if (readCount > 0) {
                            // Compute RMS from raw PCM 16-bit samples
                            var sumSquares = 0.0
                            for (i in 0 until readCount) {
                                val sample = buffer[i].toDouble()
                                sumSquares += sample * sample
                            }
                            val rms = sqrt(sumSquares / readCount)

                            // Convert to dB: 20 * log10(rms / 32768)
                            val db = if (rms > 0) {
                                20.0 * log10(rms / 32768.0)
                            } else {
                                -160.0 // Silence
                            }

                            // dB from AudioRecord is negative (0 dB = full scale).
                            // Shift to a positive range: roughly -90 dB (quiet) to 0 dB (max).
                            // Map to 0-100 scale for display.
                            val positiveDb = (db + MAX_DB).coerceIn(0.0, MAX_DB)
                            val normalized = ((positiveDb / MAX_DB) * 100.0).toFloat()

                            withContext(Dispatchers.Main) {
                                viewModel.onNoiseMeterDbUpdate(normalized)
                            }
                        }
                    }
                }
            } finally {
                recorder.stop()
                recorder.release()
                audioRecord = null
            }
        }
    }

    fun stopRecording() {
        isRecording = false
        viewModel.stopNoiseMeter()
    }

    // Auto-stop when timer reaches 0
    LaunchedEffect(uiState.noiseMeterSecondsRemaining) {
        if (uiState.noiseMeterActive && uiState.noiseMeterSecondsRemaining <= 0) {
            stopRecording()
        }
    }

    // Cleanup on dispose
    DisposableEffect(Unit) {
        onDispose {
            isRecording = false
            audioRecord?.let {
                try {
                    it.stop()
                    it.release()
                } catch (_: Exception) {}
            }
        }
    }

    NoiseMeterContent(
        uiState = uiState,
        isRecording = isRecording,
        onStartRecording = ::startRecording,
        onStopRecording = ::stopRecording,
        onNavigateBack = onNavigateBack,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NoiseMeterContent(
    uiState: GamedayUiState,
    isRecording: Boolean,
    onStartRecording: () -> Unit = {},
    onStopRecording: () -> Unit = {},
    onNavigateBack: () -> Unit = {},
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Noise Meter") },
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Timer
            if (isRecording) {
                Text(
                    text = formatTime(uiState.noiseMeterSecondsRemaining),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (uiState.noiseMeterSecondsRemaining <= 10) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.primary
                    },
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            // dB Level Gauge
            DbLevelGauge(
                level = uiState.currentDbLevel,
                isActive = isRecording,
                modifier = Modifier.size(200.dp),
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Current / Peak Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                StatCard(
                    label = "Current",
                    value = "${uiState.currentDbLevel.toInt()}",
                    unit = "dB",
                    color = MaterialTheme.colorScheme.primary,
                )
                StatCard(
                    label = "Peak",
                    value = "${uiState.peakDbLevel.toInt()}",
                    unit = "dB",
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Waveform Canvas
            WaveformVisualization(
                samples = uiState.waveformSamples,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )

            Spacer(modifier = Modifier.weight(1f))

            // Start/Stop Button
            Button(
                onClick = {
                    if (isRecording) onStopRecording() else onStartRecording()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isRecording) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.primary
                    },
                ),
            ) {
                Icon(
                    imageVector = if (isRecording) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = null,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isRecording) "Stop" else "Start Noise Meter",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            // Result card (shown after recording)
            AnimatedVisibility(
                visible = !isRecording && uiState.peakDbLevel > 0f,
                enter = fadeIn(tween(300)) + slideInVertically(tween(400)) { it },
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
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
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "Peak Volume: ${uiState.peakDbLevel.toInt()} dB",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = noiseLevelDescription(uiState.peakDbLevel),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                                    .copy(alpha = 0.7f),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── dB Level Gauge (Circular) ───────────────────────────────────────────────

@Composable
private fun DbLevelGauge(
    level: Float,
    isActive: Boolean,
    modifier: Modifier = Modifier,
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val errorColor = MaterialTheme.colorScheme.error
    val tertiaryColor = MaterialTheme.colorScheme.tertiary
    val surfaceVariantColor = MaterialTheme.colorScheme.surfaceVariant
    val onSurfaceColor = MaterialTheme.colorScheme.onSurface

    val animatedLevel by remember(level) {
        mutableFloatStateOf(level)
    }

    val infiniteTransition = rememberInfiniteTransition(label = "gauge_pulse")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulse",
    )

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 16.dp.toPx()
            val radius = (size.minDimension - strokeWidth) / 2
            val center = Offset(size.width / 2, size.height / 2)

            // Background arc (270 degrees, starting from bottom-left)
            drawArc(
                color = surfaceVariantColor,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )

            // Level arc
            val sweepAngle = (animatedLevel / 100f) * 270f
            val gaugeColor = when {
                animatedLevel > 80 -> errorColor
                animatedLevel > 50 -> tertiaryColor
                else -> primaryColor
            }

            drawArc(
                color = gaugeColor,
                startAngle = 135f,
                sweepAngle = sweepAngle,
                useCenter = false,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
        }

        // Center text
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${level.toInt()}",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize = 48.sp,
                ),
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "dB",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
            )
        }
    }
}

// ── Waveform Visualization (Canvas) ─────────────────────────────────────────

@Composable
private fun WaveformVisualization(
    samples: List<Float>,
    modifier: Modifier = Modifier,
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val tertiaryColor = MaterialTheme.colorScheme.tertiary

    Canvas(modifier = modifier) {
        if (samples.isEmpty()) return@Canvas

        val width = size.width
        val height = size.height
        val midY = height / 2
        val maxAmplitude = height / 2 * 0.9f // 90% of half height

        val path = Path()
        val stepX = width / samples.size.coerceAtLeast(1)

        samples.forEachIndexed { index, sample ->
            val x = index * stepX
            val normalizedSample = (sample / 100f).coerceIn(0f, 1f)
            val amplitude = normalizedSample * maxAmplitude

            if (index == 0) {
                path.moveTo(x, midY - amplitude)
            } else {
                val prevX = (index - 1) * stepX
                val controlX = (prevX + x) / 2
                path.cubicTo(
                    controlX, midY - (samples[index - 1] / 100f).coerceIn(0f, 1f) * maxAmplitude,
                    controlX, midY - amplitude,
                    x, midY - amplitude,
                )
            }
        }

        // Draw the waveform line
        drawPath(
            path = path,
            color = primaryColor,
            style = Stroke(
                width = 3.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round,
            ),
        )

        // Draw mirrored waveform (below center) with lower opacity
        val mirrorPath = Path()
        samples.forEachIndexed { index, sample ->
            val x = index * stepX
            val normalizedSample = (sample / 100f).coerceIn(0f, 1f)
            val amplitude = normalizedSample * maxAmplitude

            if (index == 0) {
                mirrorPath.moveTo(x, midY + amplitude)
            } else {
                val prevX = (index - 1) * stepX
                val controlX = (prevX + x) / 2
                mirrorPath.cubicTo(
                    controlX, midY + (samples[index - 1] / 100f).coerceIn(0f, 1f) * maxAmplitude,
                    controlX, midY + amplitude,
                    x, midY + amplitude,
                )
            }
        }

        drawPath(
            path = mirrorPath,
            color = tertiaryColor.copy(alpha = 0.4f),
            style = Stroke(
                width = 2.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round,
            ),
        )

        // Center line
        drawLine(
            color = primaryColor.copy(alpha = 0.2f),
            start = Offset(0f, midY),
            end = Offset(width, midY),
            strokeWidth = 1.dp.toPx(),
        )
    }
}

// ── Stat Card ───────────────────────────────────────────────────────────────

@Composable
private fun StatCard(
    label: String,
    value: String,
    unit: String,
    color: Color,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f),
        ),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 32.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = color.copy(alpha = 0.8f),
            )
            Row(
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = color,
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = unit,
                    style = MaterialTheme.typography.bodySmall,
                    color = color.copy(alpha = 0.6f),
                    modifier = Modifier.padding(bottom = 4.dp),
                )
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

private fun formatTime(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%d:%02d".format(mins, secs)
}

private fun noiseLevelDescription(db: Float): String = when {
    db >= 80 -> "Thunderous! Stadium shaking!"
    db >= 60 -> "Crowd is roaring!"
    db >= 40 -> "Decent noise level"
    db >= 20 -> "Warming up..."
    else -> "Quiet as a library"
}

// ── Previews ────────────────────────────────────────────────────────────────

@Preview(showBackground = true)
@Composable
private fun NoiseMeterIdlePreview() {
    MaterialTheme {
        NoiseMeterContent(
            uiState = GamedayUiState(),
            isRecording = false,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun NoiseMeterRecordingPreview() {
    val sampleWaveform = (0..100).map { (it % 20).toFloat() * 5f }
    MaterialTheme {
        NoiseMeterContent(
            uiState = GamedayUiState(
                noiseMeterActive = true,
                currentDbLevel = 72f,
                peakDbLevel = 85f,
                noiseMeterSecondsRemaining = 42,
                waveformSamples = sampleWaveform,
            ),
            isRecording = true,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun NoiseMeterFinishedPreview() {
    MaterialTheme {
        NoiseMeterContent(
            uiState = GamedayUiState(
                noiseMeterActive = false,
                currentDbLevel = 0f,
                peakDbLevel = 88f,
                noiseMeterSecondsRemaining = 0,
            ),
            isRecording = false,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun WaveformPreview() {
    val samples = (0..150).map { ((it * 3) % 100).toFloat() }
    MaterialTheme {
        WaveformVisualization(
            samples = samples,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant),
        )
    }
}
