package com.rally.app.feature.content.ui

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.rally.app.core.model.ContentItem
import com.rally.app.core.model.Poll
import com.rally.app.core.theme.RallyTheme
import com.rally.app.feature.content.viewmodel.ContentFeedState
import com.rally.app.feature.content.viewmodel.ContentFeedViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

// ── Public Screen Entry ─────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentFeedScreen(
    viewModel: ContentFeedViewModel = hiltViewModel(),
    onArticleClick: (articleId: String) -> Unit = {},
) {
    val state by viewModel.state.collectAsState()

    // Auto-refresh when stale
    LaunchedEffect(Unit) {
        viewModel.refreshIfStale()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Feed") })
        },
    ) { paddingValues ->
        ContentFeedBody(
            state = state,
            onRefresh = viewModel::refresh,
            onLoadMore = viewModel::loadMore,
            onArticleClick = onArticleClick,
            onPollVote = viewModel::votePoll,
            modifier = Modifier.padding(paddingValues),
        )
    }
}

// ── Stateless Feed Body ─────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ContentFeedBody(
    state: ContentFeedState,
    onRefresh: () -> Unit,
    onLoadMore: () -> Unit,
    onArticleClick: (String) -> Unit,
    onPollVote: (pollId: String, optionIndex: Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()

    // Infinite scroll trigger: load more when within 3 items of the end
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisible >= state.items.size - 3
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && state.hasMore && !state.isLoadingMore) {
            onLoadMore()
        }
    }

    when {
        state.isLoading && state.items.isEmpty() -> {
            Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        state.error != null && state.items.isEmpty() -> {
            Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "Failed to load feed:\n${state.error}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        else -> {
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = onRefresh,
                modifier = modifier.fillMaxSize(),
            ) {
                LazyColumn(
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                ) {
                    items(state.items, key = { it.id }) { item ->
                        when (item) {
                            is ContentItem.ArticleItem -> ArticleCard(
                                article = item,
                                onClick = { onArticleClick(item.id) },
                            )
                            is ContentItem.PollItem -> PollCard(
                                poll = item.poll,
                                title = item.title,
                                onVote = { optionIndex -> onPollVote(item.id, optionIndex) },
                            )
                            is ContentItem.CountdownItem -> CountdownCard(countdown = item)
                        }
                    }

                    if (state.isLoadingMore) {
                        item(key = "loading_more") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Article Card ────────────────────────────────────────────────────────

@Composable
private fun ArticleCard(
    article: ContentItem.ArticleItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                imageVector = Icons.Default.Article,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary,
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = article.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    text = article.summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = article.authorName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = formatRelativeTime(article.publishedAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

// ── Countdown Card ──────────────────────────────────────────────────────

@Composable
private fun CountdownCard(
    countdown: ContentItem.CountdownItem,
    modifier: Modifier = Modifier,
) {
    val remaining = countdown.targetEpochMillis - System.currentTimeMillis()
    val days = TimeUnit.MILLISECONDS.toDays(remaining).coerceAtLeast(0)
    val hours = (TimeUnit.MILLISECONDS.toHours(remaining) % 24).coerceAtLeast(0)
    val minutes = (TimeUnit.MILLISECONDS.toMinutes(remaining) % 60).coerceAtLeast(0)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.Timer,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
            )

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = countdown.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "${days}d ${hours}h ${minutes}m",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────

private fun formatRelativeTime(epochMillis: Long): String {
    val diff = System.currentTimeMillis() - epochMillis
    return when {
        diff < 60_000 -> "Just now"
        diff < 3_600_000 -> "${diff / 60_000}m ago"
        diff < 86_400_000 -> "${diff / 3_600_000}h ago"
        else -> {
            val formatter = SimpleDateFormat("MMM d", Locale.getDefault())
            formatter.format(Date(epochMillis))
        }
    }
}

// ── Previews ────────────────────────────────────────────────────────────

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun ContentFeedPreview() {
    RallyTheme {
        ContentFeedBody(
            state = ContentFeedState(
                items = listOf(
                    ContentItem.ArticleItem(
                        id = "1",
                        title = "Game Day Preview: Rivalry Week",
                        summary = "Everything you need to know about this weekend's rivalry showdown.",
                        imageUrl = null,
                        authorName = "Rally Staff",
                        publishedAt = System.currentTimeMillis() - 7_200_000,
                    ),
                    ContentItem.PollItem(
                        id = "2",
                        title = "Fan Poll",
                        poll = Poll(
                            question = "Who wins Saturday?",
                            options = listOf("Home", "Away"),
                            voteCounts = listOf(150, 80),
                        ),
                    ),
                    ContentItem.CountdownItem(
                        id = "3",
                        title = "Next Home Game",
                        targetEpochMillis = System.currentTimeMillis() + 259_200_000,
                    ),
                    ContentItem.ArticleItem(
                        id = "4",
                        title = "Top Rewards This Season",
                        summary = "Check out the most popular rewards redeemed by fans this season.",
                        imageUrl = null,
                        authorName = "Loyalty Team",
                        publishedAt = System.currentTimeMillis() - 86_400_000,
                    ),
                ),
                isLoading = false,
            ),
            onRefresh = {},
            onLoadMore = {},
            onArticleClick = {},
            onPollVote = { _, _ -> },
        )
    }
}
