package com.rally.app.feature.sponsor.service

import com.rally.app.core.model.Sponsor
import com.rally.app.networking.api.RallyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages sponsor data fetching, caching, and placement resolution.
 *
 * Sponsors are cached locally and refreshed on a configurable interval
 * (default 5 minutes). The [activeSponsorsList] StateFlow emits the
 * current list of active sponsors for UI observation.
 */
@Singleton
class SponsorManager @Inject constructor(
    private val api: RallyApi,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()

    private val _activeSponsorsList = MutableStateFlow<List<Sponsor>>(emptyList())

    /** Observable list of currently active sponsors. */
    val activeSponsorsList: StateFlow<List<Sponsor>> = _activeSponsorsList.asStateFlow()

    /** Placement-to-sponsor mapping for fast look-ups. */
    private val placementCache = mutableMapOf<String, Sponsor>()

    private var lastRefreshTimestamp: Long = 0L

    /** How often sponsors are automatically refreshed (milliseconds). */
    var refreshIntervalMs: Long = REFRESH_INTERVAL_MS

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Loads sponsors from the remote API and updates the local cache.
     * Safe to call from any coroutine context.
     */
    suspend fun loadSponsors() {
        try {
            val sponsors = api.getSponsors()
            mutex.withLock {
                val active = sponsors.filter { it.isActive }
                _activeSponsorsList.value = active
                rebuildPlacementCache(active)
                lastRefreshTimestamp = System.currentTimeMillis()
            }
        } catch (e: Exception) {
            // Keep serving the cached list on failure so the UI is never empty
            // if we already have data.
        }
    }

    /**
     * Returns the highest-tier active sponsor assigned to [placement],
     * or `null` if no sponsor is mapped to that placement.
     *
     * If the cache is stale (older than [refreshIntervalMs]) a background
     * refresh is triggered automatically.
     */
    suspend fun getSponsorForPlacement(placement: String): Sponsor? {
        refreshIfNeeded()
        return mutex.withLock { placementCache[placement] }
    }

    /**
     * Forces an immediate refresh of the sponsor list from the API,
     * regardless of the cache age.
     */
    suspend fun refreshSponsors() {
        loadSponsors()
    }

    /**
     * Starts an automatic background refresh loop that re-fetches sponsors
     * every [refreshIntervalMs] milliseconds. The loop runs for the
     * lifetime of the [scope].
     */
    fun startAutoRefresh() {
        scope.launch {
            while (true) {
                loadSponsors()
                delay(refreshIntervalMs)
            }
        }
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private suspend fun refreshIfNeeded() {
        val elapsed = System.currentTimeMillis() - lastRefreshTimestamp
        if (elapsed > refreshIntervalMs || _activeSponsorsList.value.isEmpty()) {
            loadSponsors()
        }
    }

    /**
     * Rebuilds the placement cache from the active sponsors list.
     * Sponsors are assumed to carry a `placement` property (or we fall
     * back to mapping by tier ordinal) so that each placement string
     * resolves to exactly one sponsor.
     */
    private fun rebuildPlacementCache(sponsors: List<Sponsor>) {
        placementCache.clear()
        for (sponsor in sponsors) {
            // Map each sponsor by its tier name as a default placement key
            // (e.g. "PRESENTING", "GOLD"). Concrete placement tags coming
            // from the backend can override this once the API supports them.
            val key = sponsor.tier.name
            val existing = placementCache[key]
            if (existing == null) {
                placementCache[key] = sponsor
            }
        }
    }

    companion object {
        /** Default refresh interval: 5 minutes. */
        private const val REFRESH_INTERVAL_MS = 5L * 60L * 1_000L
    }
}
