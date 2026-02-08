package com.vanwagner.rally.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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

// ---------------------------------------------------------------------------
// SchoolHeader
// School branding banner displaying logo, school name, and mascot, themed
// with the school's primary colors.
// Styles: Banner (full-width gradient) and Compact (inline row).
// ---------------------------------------------------------------------------

/** Layout variants for the header. */
enum class SchoolHeaderStyle {
    /** Full-width banner with large logo and gradient background. */
    Banner,
    /** Compact inline display for navigation bars or list headers. */
    Compact,
}

/**
 * School branding header.
 *
 * @param schoolName    The school display name.
 * @param mascot        The school mascot name.
 * @param abbreviation  Short abbreviation (e.g. "STU").
 * @param primaryColor  The school's primary brand color.
 * @param secondaryColor The school's secondary brand color.
 * @param modifier      Optional [Modifier].
 * @param style         Layout variant (default [SchoolHeaderStyle.Banner]).
 * @param logoUrl       Optional URL string for the school logo (placeholder rendered if null).
 */
@Composable
fun SchoolHeader(
    schoolName: String,
    mascot: String,
    abbreviation: String,
    primaryColor: Color,
    secondaryColor: Color,
    modifier: Modifier = Modifier,
    style: SchoolHeaderStyle = SchoolHeaderStyle.Banner,
) {
    when (style) {
        SchoolHeaderStyle.Banner -> SchoolHeaderBanner(
            schoolName = schoolName,
            mascot = mascot,
            abbreviation = abbreviation,
            primaryColor = primaryColor,
            secondaryColor = secondaryColor,
            modifier = modifier,
        )
        SchoolHeaderStyle.Compact -> SchoolHeaderCompact(
            schoolName = schoolName,
            mascot = mascot,
            abbreviation = abbreviation,
            primaryColor = primaryColor,
            modifier = modifier,
        )
    }
}

// -- Banner layout --

@Composable
private fun SchoolHeaderBanner(
    schoolName: String,
    mascot: String,
    abbreviation: String,
    primaryColor: Color,
    secondaryColor: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(RoundedCornerShape(RallyRadius.card))
            .background(
                Brush.linearGradient(
                    colors = listOf(primaryColor, secondaryColor),
                )
            )
            .semantics { contentDescription = "$schoolName $mascot" },
        contentAlignment = Alignment.BottomStart,
    ) {
        Row(
            modifier = Modifier
                .padding(RallySpacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(RallySpacing.smMd),
        ) {
            // Logo placeholder (circle with abbreviation)
            LogoPlaceholder(
                abbreviation = abbreviation,
                primaryColor = primaryColor,
                size = 56,
            )

            Column(verticalArrangement = Arrangement.spacedBy(RallySpacing.xs)) {
                Text(
                    text = schoolName,
                    style = RallyTypography.sectionHeader,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = mascot,
                    style = RallyTypography.subtitle,
                    color = Color.White.copy(alpha = 0.8f),
                )
            }
        }
    }
}

// -- Compact layout --

@Composable
private fun SchoolHeaderCompact(
    schoolName: String,
    mascot: String,
    abbreviation: String,
    primaryColor: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = "$schoolName $mascot" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(RallySpacing.sm),
    ) {
        LogoPlaceholder(
            abbreviation = abbreviation,
            primaryColor = primaryColor,
            size = 36,
        )

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = schoolName,
                style = RallyTypography.cardTitle,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = mascot,
                style = RallyTypography.caption,
                color = RallyColors.Gray,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Abbreviation badge
        Text(
            text = abbreviation,
            style = RallyTypography.caption.copy(fontWeight = FontWeight.Bold),
            color = primaryColor,
            modifier = Modifier
                .background(
                    color = primaryColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(50),
                )
                .padding(horizontal = RallySpacing.sm, vertical = RallySpacing.xs),
        )
    }
}

// -- Shared logo placeholder --

@Composable
private fun LogoPlaceholder(
    abbreviation: String,
    primaryColor: Color,
    size: Int,
) {
    val textStyle = if (size > 40) RallyTypography.cardTitle else RallyTypography.caption

    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(primaryColor.copy(alpha = 0.3f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = abbreviation.take(2),
            style = textStyle.copy(fontWeight = FontWeight.Bold),
            color = Color.White,
        )
    }
}

// MARK: - Previews

@Preview(name = "SchoolHeader - Banner & Compact", showBackground = true, backgroundColor = 0xFF131B2E)
@Composable
private fun SchoolHeaderPreview() {
    Surface(color = RallyColors.Navy) {
        Column(
            modifier = Modifier.padding(RallySpacing.md),
            verticalArrangement = Arrangement.spacedBy(RallySpacing.lg),
        ) {
            SchoolHeader(
                schoolName = "State University",
                mascot = "Wildcats",
                abbreviation = "STU",
                primaryColor = RallyColors.Orange,
                secondaryColor = RallyColors.Navy,
                style = SchoolHeaderStyle.Banner,
            )
            SchoolHeader(
                schoolName = "State University",
                mascot = "Wildcats",
                abbreviation = "STU",
                primaryColor = RallyColors.Orange,
                secondaryColor = RallyColors.Navy,
                style = SchoolHeaderStyle.Compact,
            )
        }
    }
}
