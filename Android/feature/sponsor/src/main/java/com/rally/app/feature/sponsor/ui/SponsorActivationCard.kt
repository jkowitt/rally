package com.rally.app.feature.sponsor.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.rally.app.core.model.Sponsor

// Rally brand colours
private val RallyOrange = Color(0xFFFF6B35)
private val RallyNavy = Color(0xFF131B2E)
private val RallyNavyMid = Color(0xFF1C2842)
private val RallyBlue = Color(0xFF2D9CDB)

/**
 * A card that displays sponsor-branded activation content.
 *
 * Shows the sponsor's logo, name, and a configurable call-to-action
 * button. Tapping the CTA invokes [onClick] so the caller can handle
 * navigation or engagement tracking.
 *
 * @param sponsor       The [Sponsor] to display.
 * @param ctaText       Label for the call-to-action button (e.g. "Learn More").
 * @param modifier      Optional [Modifier] applied to the root container.
 * @param subtitle      Optional subtitle text shown beneath the sponsor name.
 * @param onClick       Callback invoked when the user taps the CTA button.
 */
@Composable
fun SponsorActivationCard(
    sponsor: Sponsor,
    ctaText: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: (Sponsor) -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(RallyNavyMid)
            .clickable { onClick(sponsor) }
            .padding(16.dp),
    ) {
        // Header row: logo + name
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            AsyncImage(
                model = sponsor.logoURL,
                contentDescription = "${sponsor.name} logo",
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Fit,
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = sponsor.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                )

                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 12.sp,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Tier badge
        Text(
            text = sponsor.tier.name,
            style = MaterialTheme.typography.labelSmall,
            color = tierColor(sponsor.tier),
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            letterSpacing = 1.sp,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(tierColor(sponsor.tier).copy(alpha = 0.15f))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        )

        Spacer(modifier = Modifier.height(16.dp))

        // CTA button
        Button(
            onClick = { onClick(sponsor) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = RallyOrange,
                contentColor = Color.White,
            ),
        ) {
            Text(
                text = ctaText,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
            )
        }
    }
}

/**
 * Returns a colour associated with the sponsor's tier for visual
 * differentiation.
 */
@Composable
private fun tierColor(tier: com.rally.app.core.model.SponsorTier): Color {
    return when (tier) {
        com.rally.app.core.model.SponsorTier.PRESENTING -> RallyOrange
        com.rally.app.core.model.SponsorTier.PREMIUM -> RallyBlue
        com.rally.app.core.model.SponsorTier.STANDARD -> Color(0xFFC0C0C0)
    }
}
