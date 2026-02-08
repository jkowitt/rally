package com.vanwagner.rally.feature.loyalty.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vanwagner.rally.core.model.Reward
import com.vanwagner.rally.core.model.Tier
import com.vanwagner.rally.feature.loyalty.engine.PointsEngine
import com.vanwagner.rally.networking.api.RallyApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val api: RallyApi,
    private val pointsEngine: PointsEngine,
) : ViewModel() {

    // ---- internal mutable state -------------------------------------------------

    private val _rewards = MutableStateFlow<List<Reward>>(emptyList())
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)
    private val _redemptionResult = MutableStateFlow<RedemptionResult?>(null)

    // ---- public composite UI state ----------------------------------------------

    data class UiState(
        val rewards: List<Reward> = emptyList(),
        val currentPoints: Int = 0,
        val currentTier: Tier = Tier.Rookie,
        val isLoading: Boolean = false,
        val error: String? = null,
        val redemptionResult: RedemptionResult? = null,
    )

    sealed interface RedemptionResult {
        data class Success(val reward: Reward) : RedemptionResult
        data class Failure(val message: String) : RedemptionResult
    }

    val uiState: StateFlow<UiState> = combine(
        _rewards,
        pointsEngine.currentPoints,
        pointsEngine.currentTier,
        _isLoading,
        _error,
        _redemptionResult,
    ) { values ->
        @Suppress("UNCHECKED_CAST")
        UiState(
            rewards = values[0] as List<Reward>,
            currentPoints = values[1] as Int,
            currentTier = values[2] as Tier,
            isLoading = values[3] as Boolean,
            error = values[4] as String?,
            redemptionResult = values[5] as RedemptionResult?,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UiState(),
    )

    // ---- lifecycle ---------------------------------------------------------------

    init {
        loadRewards()
    }

    // ---- public actions ----------------------------------------------------------

    fun loadRewards() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val rewardsList = api.getRewards()
                _rewards.value = rewardsList
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load rewards"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun redeemReward(reward: Reward) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val success = pointsEngine.redeemReward(reward)
                _redemptionResult.value = if (success) {
                    RedemptionResult.Success(reward)
                } else {
                    RedemptionResult.Failure("Insufficient points or redemption failed")
                }
            } catch (e: Exception) {
                _redemptionResult.value =
                    RedemptionResult.Failure(e.message ?: "Redemption failed")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearRedemptionResult() {
        _redemptionResult.value = null
    }

    fun clearError() {
        _error.value = null
    }
}
