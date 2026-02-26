package com.rally.app.feature.content.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rally.app.core.model.ContentItem
import com.rally.app.core.model.Poll
import com.rally.app.core.model.PollVoteRequest
import com.rally.app.networking.api.RallyApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
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
    private val api: RallyApi,
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
                Timber.tag("Rally.Content").e(e, "Initial content load failed")
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
                Timber.tag("Rally.Content").e(e, "Content refresh failed")
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
                Timber.tag("Rally.Content").e(e, "Content pagination failed")
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
            // Optimistic UI update
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
            // Send vote to backend
            try {
                val response = api.votePoll(pollId, PollVoteRequest(optionIndex))
                if (!response.isSuccessful) {
                    Timber.tag("Rally.Content").w("Poll vote failed: %d", response.code())
                    // Revert optimistic update on failure
                    _state.update { state ->
                        state.copy(
                            items = state.items.map { item ->
                                if (item.id == pollId && item is ContentItem.PollItem) {
                                    item.copy(
                                        poll = item.poll.copy(
                                            selectedOptionIndex = null,
                                            hasVoted = false,
                                        ),
                                    )
                                } else {
                                    item
                                }
                            },
                        )
                    }
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Content").e(e, "Poll vote network error")
            }
        }
    }

    // ── Data Fetching ───────────────────────────────────────────────────

    private suspend fun fetchPage(page: Int): List<ContentItem> {
        val response = api.getContent(page = page, pageSize = PAGE_SIZE)
        if (response.isSuccessful) {
            return response.body() ?: emptyList()
        } else {
            throw RuntimeException("Content fetch failed (${response.code()})")
        }
    }
}
