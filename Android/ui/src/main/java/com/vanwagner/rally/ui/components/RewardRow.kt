package com.vanwagner.rally.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.Redeem
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.vanwagner.rally.ui.theme.RallyColors
import com.vanwagner.rally.ui.theme.RallyRadius
import com.vanwagner.rally.ui.theme.RallySpacing
import com.vanwagner.rally.ui.theme.RallyTypography
import com.vanwagner.rally.ui.theme.tierColor
import java.text.NumberFormat
import java.util.Locale

// ---------------------------------------------------------------------------
// RewardRow
// Reward catalog item: image placeholder, title, category badge, optional
// tier-lock badge, points cost, and redeem CTA.
// ---------------------------------------------------------------------------

/** Reward categories matching the iOS model. */
enum class RewardCategory(val displayName: String) {
    Merchandise("Merchandise"),
    Concessions("Concessions"),
    Experiences("Experiences"),
    Tickets("Tickets"),
    Digital("Digital"),
    Partner("Partner"),
}

/**
 * Reward list row.
 *
 * @param title       Reward display name.
 * @param pointsCost  Number of points required to redeem.
 * @param category    The [RewardCategory].
 * @param modifier    Optional [Modifier].
 * @param userPoints  The user's current point balance (default 0).
 * @param minimumTier Tier name required (e.g. "MVP"); `null` or "Rookie" hides badge.
 * @param onRedeem    Callback invoked when the redeem button is tapped.
 */
@Composable
fun RewardRow(
    title: String,
    pointsCost: Int,
    category: RewardCategory,
    modifier: Modifier = Modifier,
    userPoints: Int = 0,
    minimumTier: String? = null,
    onRedeem: (() -> Unit)? = null,
) {
    val canAfford = userPoints >= pointsCost
    val pointsFormatted = NumberFormat.getNumberInstance(Locale.US).format(pointsCost)

    val a11yLabel = buildString {
        append("$title, $pointsCost points")
        if (canAfford) append(", available to redeem")
        else append(", need ${pointsCost - userPoints} more points")
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(RallyRadius.card))
            .background(RallyColors.NavyMid)
            .padding(RallySpacing.smMd)
            .semantics { contentDescription = a11yLabel },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
    ) {
        // Reward image placeholder
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(RallyRadius.small))
                .background(RallyColors.Navy),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = categoryIcon(category),
                contentDescription = null,
                tint = RallyColors.Gray.copy(alpha = 0.6f),
                modifier = Modifier.size(24.dp),
            )
        }

        // Text content
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.xs),
        ) {
            Text(
                text = title,
                style = RallyTypography.cardTitle,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            // Category + tier badges
            Row(horizontalArrangement = Arrangement.spacedBy(RallySpacing.xs)) {
                // Category badge
                Text(
                    text = category.displayName,
                    style = RallyTypography.caption,
                    color = RallyColors.Blue,
                    modifier = Modifier
                        .background(
                            color = RallyColors.Blue.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(50),
                        )
                        .padding(horizontal = RallySpacing.sm, vertical = 2.dp),
                )

                // Tier badge (if not Rookie / null)
                val showTier = minimumTier != null &&
                    minimumTier.lowercase() != "rookie"
                if (showTier) {
                    val tColor = tierColor(minimumTier!!)
                    Text(
                        text = minimumTier,
                        style = RallyTypography.caption,
                        color = tColor,
                        modifier = Modifier
                            .background(
                                color = tColor.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(50),
                            )
                            .padding(horizontal = RallySpacing.sm, vertical = 2.dp),
                    )
                }
            }

            // Points cost
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(RallySpacing.xs),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = RallyColors.Orange,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    text = pointsFormatted,
                    style = RallyTypography.buttonLabel,
                    color = if (canAfford) RallyColors.Orange else RallyColors.Gray,
                )
            }
        }

        // Redeem CTA
        val ctaBackground = if (canAfford) RallyColors.Orange else RallyColors.Navy
        val ctaForeground = if (canAfford) Color.White else RallyColors.Gray
        val ctaText = if (canAfford) "Redeem" else "Need more"

        Text(
            text = ctaText,
            style = RallyTypography.caption.copy(fontWeight = FontWeight.SemiBold),
            color = ctaForeground,
            modifier = Modifier
                .clip(RoundedCornerShape(RallyRadius.button))
                .background(ctaBackground)
                .then(
                    if (canAfford && onRedeem != null) {
                        Modifier.clickable(onClick = onRedeem)
                    } else {
                        Modifier
                    }
                )
                .padding(horizontal = RallySpacing.smMd, vertical = RallySpacing.sm),
        )
    }
}

// -- Icon mapping --

private fun categoryIcon(category: RewardCategory): ImageVector = when (category) {
    RewardCategory.Merchandise -> Icons.Filled.ShoppingBag
    RewardCategory.Concessions -> Icons.Filled.Fastfood
    RewardCategory.Experiences -> Icons.Filled.ConfirmationNumber
    RewardCategory.Tickets     -> Icons.Filled.ConfirmationNumber
    RewardCategory.Digital     -> Icons.Filled.CardGiftcard
    RewardCategory.Partner     -> Icons.Filled.Store
}

// MARK: - Previews

@Preview(name = "RewardRow - Variants", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun RewardRowPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier
                .padding(RallySpacing.md)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
        ) {
            RewardRow(
                title = "Team T-Shirt",
                pointsCost = 500,
                category = RewardCategory.Merchandise,
                userPoints = 1200,
            )
            RewardRow(
                title = "VIP Sideline Experience",
                pointsCost = 5000,
                category = RewardCategory.Experiences,
                userPoints = 1200,
                minimumTier = "MVP",
            )
            RewardRow(
                title = "Free Hot Dog Combo",
                pointsCost = 200,
                category = RewardCategory.Concessions,
                userPoints = 1200,
            )
        }
    }
}
