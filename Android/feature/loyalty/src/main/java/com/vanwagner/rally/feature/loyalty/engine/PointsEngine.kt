package com.vanwagner.rally.feature.loyalty.engine

import com.vanwagner.rally.core.model.PointsTransaction
import com.vanwagner.rally.core.model.Reward
import com.vanwagner.rally.core.model.Tier
import com.vanwagner.rally.networking.api.RallyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Central engine for managing loyalty points, tiers, and transaction history.
 *
 * Thread-safe via [MutableStateFlow] backed state and coroutine confinement to
 * [Dispatchers.IO] for all network/persistence work. This is the Android
 * equivalent of the iOS actor-based PointsEngine.
 */
@Singleton
class PointsEngine @Inject constructor(
    private val api: RallyApi,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // --------------- public state ------------------------------------------------

    private val _currentPoints = MutableStateFlow(0)
    val currentPoints: StateFlow<Int> = _currentPoints.asStateFlow()

    private val _currentTier = MutableStateFlow(Tier.Rookie)
    val currentTier: StateFlow<Tier> = _currentTier.asStateFlow()

    private val _transactions = MutableStateFlow<List<PointsTransaction>>(emptyList())
    val transactions: StateFlow<List<PointsTransaction>> = _transactions.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    // --------------- public API ---------------------------------------------------

    /**
     * Award points to the current user.
     *
     * @param amount  positive number of points to add
     * @param source  machine-readable source tag (e.g. "checkin", "prediction")
     * @param description  human-readable description shown in history
     * @return the newly created [PointsTransaction], or `null` on failure
     */
    suspend fun awardPoints(
        amount: Int,
        source: String,
        description: String,
    ): PointsTransaction? = withContext(Dispatchers.IO) {
        require(amount > 0) { "Award amount must be positive, was $amount" }
        _isProcessing.value = true
        try {
            val transaction = api.awardPoints(amount = amount, source = source, description = description)
            _currentPoints.update { it + amount }
            _currentTier.value = computeTier(_currentPoints.value)
            _transactions.update { listOf(transaction) + it }
            transaction
        } catch (e: Exception) {
            // Callers can observe isProcessing flipping back to false with a null
            // return to know the operation failed. Logging is handled upstream by
            // the analytics layer.
            null
        } finally {
            _isProcessing.value = false
        }
    }

    /**
     * Redeem a reward, deducting its point cost from the user balance.
     *
     * @return `true` when the redemption succeeds, `false` otherwise.
     */
    suspend fun redeemReward(reward: Reward): Boolean = withContext(Dispatchers.IO) {
        if (_currentPoints.value < reward.pointsCost) return@withContext false

        _isProcessing.value = true
        try {
            val transaction = api.redeemReward(rewardId = reward.id)
            _currentPoints.update { it - reward.pointsCost }
            _currentTier.value = computeTier(_currentPoints.value)
            _transactions.update { listOf(transaction) + it }
            true
        } catch (e: Exception) {
            false
        } finally {
            _isProcessing.value = false
        }
    }

    /**
     * Fetch the full points history from the server and refresh local state.
     */
    suspend fun fetchHistory() = withContext(Dispatchers.IO) {
        _isProcessing.value = true
        try {
            val history = api.getPointsHistory()
            _transactions.value = history.transactions
            _currentPoints.value = history.totalPoints
            _currentTier.value = computeTier(history.totalPoints)
        } catch (_: Exception) {
            // Silently keep stale data; UI can show a retry affordance via
            // isProcessing returning to false with unchanged data.
        } finally {
            _isProcessing.value = false
        }
    }

    /**
     * Pure function that maps a cumulative point total to its [Tier].
     *
     * Tier thresholds (cumulative):
     * - Rookie      :      0
     * - Starter     :    500
     * - AllStar     :  2 000
     * - MVP         :  5 000
     * - HallOfFame  : 15 000
     */
    fun computeTier(points: Int): Tier = when {
        points >= 15_000 -> Tier.HallOfFame
        points >= 5_000  -> Tier.MVP
        points >= 2_000  -> Tier.AllStar
        points >= 500    -> Tier.Starter
        else             -> Tier.Rookie
    }

    // --------------- helpers ------------------------------------------------------

    /**
     * Convenience: kick off a background refresh so collectors get updated state
     * without the caller needing to manage a coroutine.
     */
    fun refreshInBackground() {
        scope.launch { fetchHistory() }
    }
}
