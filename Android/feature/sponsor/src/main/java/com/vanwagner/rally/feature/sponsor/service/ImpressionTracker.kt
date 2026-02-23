package com.vanwagner.rally.feature.sponsor.service

import com.vanwagner.rally.core.model.SponsorImpression
import com.vanwagner.rally.networking.api.RallyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Batches sponsor / ad-view impressions and flushes them to the
 * backend periodically.
 *
 * Impressions are buffered in memory and sent to the API either:
 * - Every [FLUSH_INTERVAL_MS] (30 seconds), **or**
 * - When the buffer reaches [BATCH_SIZE] (10 impressions),
 *
 * whichever comes first. A manual [flush] is also available for
 * lifecycle-critical moments (e.g. the user backgrounds the app).
 */
@Singleton
class ImpressionTracker @Inject constructor(
    private val api: RallyApi,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()

    private val buffer = mutableListOf<SponsorImpression>()
    private var timerRunning = false

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Records a single impression.
     *
     * @param sponsorId   The ID of the sponsor whose content was viewed.
     * @param activationId The activation / placement that triggered the view.
     * @param viewDuration How long (in milliseconds) the content was visible.
     */
    fun trackImpression(
        sponsorId: String,
        activationId: String,
        viewDuration: Long,
    ) {
        scope.launch {
            val impression = SponsorImpression(
                sponsorID = sponsorId,
                placement = activationId,
                durationSeconds = viewDuration / 1000.0,
                timestamp = System.currentTimeMillis(),
            )

            val shouldFlush = mutex.withLock {
                buffer.add(impression)
                buffer.size >= BATCH_SIZE
            }

            if (shouldFlush) {
                flush()
            } else {
                ensureTimerRunning()
            }
        }
    }

    /**
     * Immediately sends all buffered impressions to the API.
     * Safe to call from any context; duplicate flushes are coalesced
     * via the mutex.
     */
    suspend fun flush() {
        val batch = mutex.withLock {
            if (buffer.isEmpty()) return
            val snapshot = buffer.toList()
            buffer.clear()
            snapshot
        }

        try {
            api.sendImpressions(batch)
        } catch (e: Exception) {
            // Re-buffer on failure so impressions are not lost.
            mutex.withLock {
                buffer.addAll(0, batch)
            }
        }
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    /**
     * Starts the periodic flush timer if it is not already running.
     */
    private fun ensureTimerRunning() {
        if (timerRunning) return
        timerRunning = true

        scope.launch {
            while (true) {
                delay(FLUSH_INTERVAL_MS)

                val hasItems = mutex.withLock { buffer.isNotEmpty() }
                if (hasItems) {
                    flush()
                }
            }
        }
    }

    companion object {
        /** Flush every 30 seconds. */
        private const val FLUSH_INTERVAL_MS = 30_000L

        /** Flush when the buffer reaches this size. */
        private const val BATCH_SIZE = 10
    }
}
