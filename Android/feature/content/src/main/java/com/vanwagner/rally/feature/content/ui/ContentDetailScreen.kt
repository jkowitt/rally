package com.vanwagner.rally.feature.content.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.vanwagner.rally.core.model.ArticleDetail
import com.vanwagner.rally.core.theme.RallyTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ── Public Screen Entry ─────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentDetailScreen(
    article: ArticleDetail,
    onNavigateBack: () -> Unit = {},
    onShare: () -> Unit = {},
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Article", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onShare) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                        )
                    }
                },
            )
        },
    ) { paddingValues ->
        ContentDetailBody(
            article = article,
            modifier = Modifier.padding(paddingValues),
        )
    }
}

// ── Stateless Detail Body ───────────────────────────────────────────────

@Composable
private fun ContentDetailBody(
    article: ArticleDetail,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    val dateFormatter = SimpleDateFormat("MMMM d, yyyy 'at' h:mm a", Locale.getDefault())

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(16.dp))

        // ── Category Tag ────────────────────────────────────────────────
        if (article.category.isNotBlank()) {
            Text(
                text = article.category.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
        }

        // ── Title ───────────────────────────────────────────────────────
        Text(
            text = article.title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(Modifier.height(12.dp))

        // ── Author & Date ───────────────────────────────────────────────
        Text(
            text = "By ${article.authorName}",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(Modifier.height(4.dp))

        Text(
            text = dateFormatter.format(Date(article.publishedAt)),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(16.dp))

        // ── Hero Image Placeholder ──────────────────────────────────────
        if (article.heroImageUrl != null) {
            // TODO: Replace with AsyncImage (Coil) when image loading is wired up
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .padding(bottom = 16.dp),
            ) {
                Text(
                    text = "[Hero Image]",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        HorizontalDivider()

        Spacer(Modifier.height(16.dp))

        // ── Article Body ────────────────────────────────────────────────
        article.bodyParagraphs.forEach { paragraph ->
            Text(
                text = paragraph,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
        }

        // ── Tags ────────────────────────────────────────────────────────
        if (article.tags.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))

            Text(
                text = "Tags",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = article.tags.joinToString("  ") { "#$it" },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
            )
        }

        Spacer(Modifier.height(32.dp))
    }
}

// ── Previews ────────────────────────────────────────────────────────────

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun ContentDetailPreview() {
    RallyTheme {
        ContentDetailBody(
            article = ArticleDetail(
                id = "1",
                title = "Rivalry Week: Everything You Need to Know",
                category = "Game Day",
                authorName = "Rally Staff",
                publishedAt = System.currentTimeMillis() - 7_200_000,
                heroImageUrl = "https://example.com/hero.jpg",
                bodyParagraphs = listOf(
                    "This Saturday marks one of the biggest rivalries in college athletics. The atmosphere will be electric as both fan bases descend on the stadium for what promises to be an unforgettable showdown.",
                    "Rally has exclusive in-app activations planned throughout the game, including a halftime trivia challenge with bonus loyalty points and a noise meter competition between sections.",
                    "Make sure to check in at the venue gates to earn your Game Day attendance points. Beacon-based section detection will automatically award bonus points if you stay for the full game.",
                    "Don't forget to cast your vote in the pre-game poll -- the winning option earns voters double prediction points!",
                ),
                tags = listOf("rivalry", "gameday", "football", "loyalty"),
            ),
        )
    }
}
