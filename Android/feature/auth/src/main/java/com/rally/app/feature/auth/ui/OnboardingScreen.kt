package com.rally.app.feature.auth.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.rally.app.core.theme.RallyTheme
import com.rally.app.feature.auth.viewmodel.AuthState
import com.rally.app.feature.auth.viewmodel.AuthViewModel
import com.rally.app.feature.auth.viewmodel.OnboardingStep

// ── Public Screen Entry ─────────────────────────────────────────────────

@Composable
fun OnboardingScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onNavigateToSchoolSelector: () -> Unit = {},
    onOnboardingComplete: () -> Unit = {},
) {
    val state by viewModel.state.collectAsState()

    val onboardingState = state as? AuthState.Onboarding ?: return

    Scaffold { paddingValues ->
        OnboardingContent(
            step = onboardingState.step,
            onAdvance = {
                if (onboardingState.step == OnboardingStep.SCHOOL_SELECTION) {
                    onNavigateToSchoolSelector()
                } else {
                    viewModel.advanceOnboarding()
                }
            },
            onComplete = onOnboardingComplete,
            modifier = Modifier.padding(paddingValues),
        )
    }
}

// ── Stateless Content ───────────────────────────────────────────────────

@Composable
private fun OnboardingContent(
    step: OnboardingStep,
    onAdvance: () -> Unit,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = when (step) {
        OnboardingStep.WELCOME -> 0.33f
        OnboardingStep.SCHOOL_SELECTION -> 0.66f
        OnboardingStep.PERMISSIONS -> 1f
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
    ) {
        // ── Progress Bar ────────────────────────────────────────────────
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp),
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )

        Spacer(Modifier.height(32.dp))

        // ── Animated Step Content ───────────────────────────────────────
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                (slideInHorizontally { it } + fadeIn())
                    .togetherWith(slideOutHorizontally { -it } + fadeOut())
            },
            label = "onboarding_step",
            modifier = Modifier.weight(1f),
        ) { currentStep ->
            when (currentStep) {
                OnboardingStep.WELCOME -> WelcomeStep()
                OnboardingStep.SCHOOL_SELECTION -> SchoolSelectionStep()
                OnboardingStep.PERMISSIONS -> PermissionsStep(onComplete = onComplete)
            }
        }

        // ── Bottom Action ───────────────────────────────────────────────
        if (step != OnboardingStep.PERMISSIONS) {
            Button(
                onClick = onAdvance,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    text = when (step) {
                        OnboardingStep.WELCOME -> "Get Started"
                        OnboardingStep.SCHOOL_SELECTION -> "Choose Your School"
                        OnboardingStep.PERMISSIONS -> "Finish"
                    },
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

// ── Step: Welcome ───────────────────────────────────────────────────────

@Composable
private fun WelcomeStep(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Campaign,
            contentDescription = null,
            modifier = Modifier.size(96.dp),
            tint = MaterialTheme.colorScheme.primary,
        )

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Welcome to Rally!",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(12.dp))

        Text(
            text = "The ultimate fan engagement platform.\n" +
                "Earn points, unlock rewards, and rally\n" +
                "with your fellow fans on game day.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ── Step: School Selection Prompt ───────────────────────────────────────

@Composable
private fun SchoolSelectionStep(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.School,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary,
        )

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Pick Your School",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(12.dp))

        Text(
            text = "Choose the school you want to rally for.\n" +
                "This will personalize your theme, content,\n" +
                "and game day experience.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ── Step: Permissions ───────────────────────────────────────────────────

@Composable
private fun PermissionsStep(
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var locationGranted by remember { mutableStateOf(false) }
    var notificationsGranted by remember { mutableStateOf(false) }

    val locationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { permissions ->
        locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    val notificationLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        notificationsGranted = granted
    }

    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(32.dp))

        Text(
            text = "Enable Permissions",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "Rally uses location for automatic game day\ncheck-ins and notifications to keep you updated.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(40.dp))

        // ── Location Permission ─────────────────────────────────────────
        PermissionRow(
            icon = Icons.Filled.LocationOn,
            title = "Location Access",
            subtitle = "For automatic venue check-in",
            granted = locationGranted,
            onRequest = {
                locationLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                    ),
                )
            },
        )

        Spacer(Modifier.height(16.dp))

        // ── Notification Permission ─────────────────────────────────────
        PermissionRow(
            icon = Icons.Filled.Notifications,
            title = "Notifications",
            subtitle = "Game updates and reward alerts",
            granted = notificationsGranted,
            onRequest = {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    notificationsGranted = true
                }
            },
        )

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onComplete,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text("Finish Setup", style = MaterialTheme.typography.labelLarge)
        }

        Spacer(Modifier.height(8.dp))

        TextButton(onClick = onComplete) {
            Text("Skip for now")
        }
    }
}

@Composable
private fun PermissionRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    granted: Boolean,
    onRequest: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(40.dp),
            tint = if (granted) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )

        Spacer(Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        if (granted) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = "Granted",
                tint = MaterialTheme.colorScheme.primary,
            )
        } else {
            TextButton(onClick = onRequest) {
                Text("Enable")
            }
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun OnboardingWelcomePreview() {
    RallyTheme {
        OnboardingContent(
            step = OnboardingStep.WELCOME,
            onAdvance = {},
            onComplete = {},
        )
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "School Selection")
@Composable
private fun OnboardingSchoolPreview() {
    RallyTheme {
        OnboardingContent(
            step = OnboardingStep.SCHOOL_SELECTION,
            onAdvance = {},
            onComplete = {},
        )
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "Permissions")
@Composable
private fun OnboardingPermissionsPreview() {
    RallyTheme {
        OnboardingContent(
            step = OnboardingStep.PERMISSIONS,
            onAdvance = {},
            onComplete = {},
        )
    }
}
