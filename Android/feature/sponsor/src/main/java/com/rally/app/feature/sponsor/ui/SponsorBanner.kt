package com.rally.app.feature.sponsor.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.rally.app.core.model.Sponsor
import com.rally.app.feature.sponsor.service.ImpressionTracker
import com.rally.app.feature.sponsor.service.SponsorManager

// Rally brand colours
private val RallyNavyMid = Color(0xFF1C2842)
private val RallyOrange = Color(0xFFFF6B35)
private val RallyNavy = Color(0xFF131B2E)

/**
 * A composable banner that displays a sponsor's logo and "Presented by"
 * attribution for a given [placement].
 *
 * The banner fades in when the sponsor data becomes available and
 * automatically tracks an impression for the duration it remains
 * visible on screen.
 *
 * @param placement   Placement identifier used to resolve the sponsor.
 * @param modifier    Optional [Modifier] applied to the root container.
 * @param sponsorManager  The [SponsorManager] instance (provided via Hilt).
 * @param impressionTracker The [ImpressionTracker] instance (provided via Hilt).
 */
@Composable
fun SponsorBanner(
    placement: String,
    modifier: Modifier = Modifier,
    sponsorManager: SponsorManager,
    impressionTracker: ImpressionTracker,
) {
    var sponsor by remember { mutableStateOf<Sponsor?>(null) }
    var visible by remember { mutableStateOf(false) }
    val impressionStart = remember { mutableLongStateOf(0L) }

    // Resolve sponsor for the requested placement
    LaunchedEffect(placement) {
        sponsor = sponsorManager.getSponsorForPlacement(placement)
        if (sponsor != null) {
            visible = true
            impressionStart.longValue = System.currentTimeMillis()
        }
    }

    // Track impression duration when the composable leaves the composition
    val currentSponsor = sponsor
    DisposableEffect(currentSponsor) {
        onDispose {
            if (currentSponsor != null && impressionStart.longValue > 0L) {
                val duration = System.currentTimeMillis() - impressionStart.longValue
                impressionTracker.trackImpression(
                    sponsorId = currentSponsor.id,
                    activationId = placement,
                    viewDuration = duration,
                )
            }
        }
    }

    // Render
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(),
    ) {
        currentSponsor?.let { sp ->
            Column(
                modifier = modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(RallyNavyMid)
                    .padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "Presented by",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 1.sp,
                )

                AsyncImage(
                    model = sp.logoURL,
                    contentDescription = "${sp.name} logo",
                    modifier = Modifier
                        .height(40.dp)
                        .padding(horizontal = 16.dp),
                    contentScale = ContentScale.Fit,
                )
            }
        }
    }
}
