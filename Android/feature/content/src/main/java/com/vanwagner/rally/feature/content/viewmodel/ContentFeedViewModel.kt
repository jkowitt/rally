package com.vanwagner.rally.feature.content.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vanwagner.rally.core.model.ContentItem
import com.vanwagner.rally.core.model.ContentType
import com.vanwagner.rally.core.model.Poll
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── Feed State ──────────────────────────────────────────────────────────

data class ContentFeedState(
    /** The visible feed items, in display order. */
    val items: List<ContentItem> = emptyList(),
    /** Whether the initial load is in progress. */
    val isLoading: Boolean = false,
    /** Whether a pull-to-refresh is in progress. */
    val isRefreshing: Boolean = false,
    /** Whether more pages are available. */
    val hasMore: Boolean = true,
    /** Whether we are currently fetching the next page. */
    val isLoadingMore: Boolean = false,
    /** Human-readable error, if any. */
    val error: String? = null,
    /** Epoch millis of the last successful fetch. */
    val lastFetchedAt: Long = 0L,
)

// ── ViewModel ───────────────────────────────────────────────────────────

@HiltViewModel
class ContentFeedViewModel @Inject constructor(
    // TODO: inject ContentRepository when available
) : ViewModel() {

    companion object {
        private const val PAGE_SIZE = 20
        /** Content is considered stale after 1 hour. */
        private const val STALE_THRESHOLD_MS = 60L * 60 * 1_000
    }

    private val _state = MutableStateFlow(ContentFeedState())
    val state: StateFlow<ContentFeedState> = _state.asStateFlow()

    private var currentPage = 0

    init {
        loadInitial()
    }

    // ── Initial Load ────────────────────────────────────────────────────

    private fun loadInitial() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val items = fetchPage(page = 0)
                currentPage = 0
                _state.update {
                    it.copy(
                        items = items,
                        isLoading = false,
                        hasMore = items.size >= PAGE_SIZE,
                        lastFetchedAt = System.currentTimeMillis(),
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    // ── Pull-to-Refresh ─────────────────────────────────────────────────

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true, error = null) }
            try {
                val items = fetchPage(page = 0)
                currentPage = 0
                _state.update {
                    it.copy(
                        items = items,
                        isRefreshing = false,
                        hasMore = items.size >= PAGE_SIZE,
                        lastFetchedAt = System.currentTimeMillis(),
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isRefreshing = false, error = e.message) }
            }
        }
    }

    // ── Pagination ──────────────────────────────────────────────────────

    fun loadMore() {
        val current = _state.value
        if (current.isLoadingMore || !current.hasMore) return

        viewModelScope.launch {
            _state.update { it.copy(isLoadingMore = true) }
            try {
                val nextPage = currentPage + 1
                val newItems = fetchPage(page = nextPage)
                currentPage = nextPage
                _state.update {
                    it.copy(
                        items = it.items + newItems,
                        isLoadingMore = false,
                        hasMore = newItems.size >= PAGE_SIZE,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoadingMore = false, error = e.message) }
            }
        }
    }

    // ── Staleness Check ─────────────────────────────────────────────────

    /** `true` if the feed has not been refreshed in the last hour. */
    val isStale: Boolean
        get() {
            val lastFetch = _state.value.lastFetchedAt
            return lastFetch == 0L ||
                (System.currentTimeMillis() - lastFetch) > STALE_THRESHOLD_MS
        }

    /** Auto-refresh if content is stale. Call from screen's LaunchedEffect. */
    fun refreshIfStale() {
        if (isStale) refresh()
    }

    // ── Poll Voting ─────────────────────────────────────────────────────

    fun votePoll(pollId: String, optionIndex: Int) {
        viewModelScope.launch {
            _state.update { state ->
                state.copy(
                    items = state.items.map { item ->
                        if (item.id == pollId && item is ContentItem.PollItem) {
                            item.copy(
                                poll = item.poll.copy(
                                    selectedOptionIndex = optionIndex,
                                    hasVoted = true,
                                ),
                            )
                        } else {
                            item
                        }
                    },
                )
            }
            // TODO: send vote to backend
        }
    }

    // ── Data Fetching ───────────────────────────────────────────────────

    /**
     * Fetches a page of content items from the repository.
     * TODO: Replace with real repository call.
     */
    private suspend fun fetchPage(page: Int): List<ContentItem> {
        // Simulated network delay
        delay(500)

        val offset = page * PAGE_SIZE
        return buildList {
            for (i in 0 until PAGE_SIZE) {
                val index = offset + i
                when {
                    index % 5 == 0 -> add(
                        ContentItem.PollItem(
                            id = "poll_$index",
                            title = "Game Day Poll #${index + 1}",
                            poll = Poll(
                                question = "Who will score the first touchdown?",
                                options = listOf("Player A", "Player B", "Player C", "Other"),
                                voteCounts = listOf(42, 38, 15, 5),
                            ),
                        ),
                    )
                    index % 7 == 0 -> add(
                        ContentItem.CountdownItem(
                            id = "countdown_$index",
                            title = "Next Home Game",
                            targetEpochMillis = System.currentTimeMillis() + (3 * 24 * 60 * 60 * 1_000L),
                        ),
                    )
                    else -> add(
                        ContentItem.ArticleItem(
                            id = "article_$index",
                            title = "Rally Feature Story #${index + 1}",
                            summary = "An exciting preview of the upcoming game day experience with exclusive behind-the-scenes access.",
                            imageUrl = null,
                            authorName = "Rally Staff",
                            publishedAt = System.currentTimeMillis() - (index * 3_600_000L),
                        ),
                    )
                }
            }
        }
    }
}
