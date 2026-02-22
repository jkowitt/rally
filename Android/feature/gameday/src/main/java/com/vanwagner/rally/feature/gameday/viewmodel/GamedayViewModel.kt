package com.vanwagner.rally.feature.gameday.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vanwagner.rally.core.model.Activation
import com.vanwagner.rally.core.model.ActivationStatus
import com.vanwagner.rally.core.model.ActivationType
import com.vanwagner.rally.core.model.CheckInResponse
import com.vanwagner.rally.core.model.Event
import com.vanwagner.rally.core.model.LeaderboardEntry
import com.vanwagner.rally.core.model.SubmissionResult
import com.vanwagner.rally.networking.api.RallyApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

// ── UI State ────────────────────────────────────────────────────────────────

data class GamedayUiState(
    val event: Event? = null,
    val activations: List<Activation> = emptyList(),
    val isCheckedIn: Boolean = false,
    val checkInPoints: Int = 0,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val leaderboard: List<LeaderboardEntry> = emptyList(),
    val webSocketConnected: Boolean = false,
    val noiseMeterActive: Boolean = false,
    val currentDbLevel: Float = 0f,
    val peakDbLevel: Float = 0f,
    val noiseMeterSecondsRemaining: Int = 60,
    val waveformSamples: List<Float> = emptyList(),
)

sealed interface GamedayEvent {
    data class CheckInSuccess(val points: Int) : GamedayEvent
    data class ActivationComplete(val points: Int) : GamedayEvent
    data class Error(val message: String) : GamedayEvent
    data object NavigateToCheckIn : GamedayEvent
    data class NavigateToPrediction(val activationId: String) : GamedayEvent
    data class NavigateToTrivia(val activationId: String) : GamedayEvent
    data object NavigateToNoiseMeter : GamedayEvent
    data object NavigateToLeaderboard : GamedayEvent
}

// ── ViewModel ───────────────────────────────────────────────────────────────

@HiltViewModel
class GamedayViewModel @Inject constructor(
    private val api: RallyApi,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val eventId: String = savedStateHandle.get<String>("eventId") ?: ""

    private val _uiState = MutableStateFlow(GamedayUiState())
    val uiState: StateFlow<GamedayUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<GamedayEvent>()
    val events: SharedFlow<GamedayEvent> = _events.asSharedFlow()

    private var webSocketJob: Job? = null
    private var noiseMeterJob: Job? = null

    init {
        loadGameday()
        connectWebSocket()
    }

    // ── Data Loading ────────────────────────────────────────────────────

    fun loadGameday() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val eventResponse = api.getSchoolEvents(eventId)
                val activationsResponse = api.getActivations(eventId)

                val event = eventResponse.body()?.firstOrNull()
                val activations = activationsResponse.body() ?: emptyList()

                _uiState.update {
                    it.copy(
                        event = event,
                        activations = activations,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Gameday").e(e, "Failed to load gameday data")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load gameday. Pull to refresh.",
                    )
                }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            try {
                val activationsResponse = api.getActivations(eventId)
                val activations = activationsResponse.body() ?: emptyList()
                _uiState.update {
                    it.copy(activations = activations, isRefreshing = false)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRefreshing = false) }
                _events.emit(GamedayEvent.Error("Refresh failed"))
            }
        }
    }

    // ── Check-In ────────────────────────────────────────────────────────

    fun performCheckIn() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val response = api.checkIn(eventId)
                if (response.isSuccessful) {
                    val body = response.body()
                    val points = body?.pointsEarned ?: 0
                    _uiState.update {
                        it.copy(
                            isCheckedIn = true,
                            checkInPoints = points,
                            isLoading = false,
                        )
                    }
                    _events.emit(GamedayEvent.CheckInSuccess(points))
                } else {
                    _uiState.update { it.copy(isLoading = false) }
                    _events.emit(GamedayEvent.Error("Check-in failed. Please try again."))
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Gameday").e(e, "Check-in error")
                _uiState.update { it.copy(isLoading = false) }
                _events.emit(GamedayEvent.Error("Check-in failed. Verify your location."))
            }
        }
    }

    // ── Activation Submission ───────────────────────────────────────────

    fun submitActivation(activationId: String, payload: Map<String, String> = emptyMap()) {
        viewModelScope.launch {
            try {
                val response = api.submitActivation(activationId)
                if (response.isSuccessful) {
                    val result = response.body()
                    val points = result?.pointsEarned ?: 0
                    // Mark activation as completed locally
                    _uiState.update { state ->
                        state.copy(
                            activations = state.activations.map { activation ->
                                if (activation.id == activationId) {
                                    activation.copy(status = ActivationStatus.COMPLETED)
                                } else {
                                    activation
                                }
                            }
                        )
                    }
                    _events.emit(GamedayEvent.ActivationComplete(points))
                } else {
                    _events.emit(GamedayEvent.Error("Submission failed. Try again."))
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Gameday").e(e, "Activation submission error")
                _events.emit(GamedayEvent.Error("Network error. Please try again."))
            }
        }
    }

    // ── Navigation Triggers ─────────────────────────────────────────────

    fun onActivationTapped(activation: Activation) {
        viewModelScope.launch {
            when (activation.type) {
                ActivationType.PREDICTION -> _events.emit(
                    GamedayEvent.NavigateToPrediction(activation.id)
                )
                ActivationType.TRIVIA -> _events.emit(
                    GamedayEvent.NavigateToTrivia(activation.id)
                )
                ActivationType.NOISE_METER -> _events.emit(GamedayEvent.NavigateToNoiseMeter)
                else -> {} // handle other types as needed
            }
        }
    }

    fun onCheckInTapped() {
        viewModelScope.launch {
            _events.emit(GamedayEvent.NavigateToCheckIn)
        }
    }

    fun onLeaderboardTapped() {
        viewModelScope.launch {
            _events.emit(GamedayEvent.NavigateToLeaderboard)
        }
    }

    // ── WebSocket ───────────────────────────────────────────────────────

    private fun connectWebSocket() {
        webSocketJob?.cancel()
        webSocketJob = viewModelScope.launch {
            _uiState.update { it.copy(webSocketConnected = true) }
            // In a real implementation, this would connect to an OkHttp WebSocket
            // and parse incoming messages to update activations, scores, and leaderboard.
            // For now, we mark the connection state and poll as a fallback.
            try {
                while (true) {
                    delay(30_000) // Poll every 30s as fallback
                    refresh()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(webSocketConnected = false) }
            }
        }
    }

    fun disconnectWebSocket() {
        webSocketJob?.cancel()
        webSocketJob = null
        _uiState.update { it.copy(webSocketConnected = false) }
    }

    // ── Noise Meter ─────────────────────────────────────────────────────

    fun onNoiseMeterDbUpdate(dbLevel: Float) {
        _uiState.update { state ->
            val newSamples = (state.waveformSamples + dbLevel).takeLast(200)
            state.copy(
                currentDbLevel = dbLevel,
                peakDbLevel = maxOf(state.peakDbLevel, dbLevel),
                waveformSamples = newSamples,
            )
        }
    }

    fun startNoiseMeterTimer() {
        noiseMeterJob?.cancel()
        _uiState.update {
            it.copy(
                noiseMeterActive = true,
                noiseMeterSecondsRemaining = 60,
                currentDbLevel = 0f,
                peakDbLevel = 0f,
                waveformSamples = emptyList(),
            )
        }
        noiseMeterJob = viewModelScope.launch {
            for (remaining in 59 downTo 0) {
                delay(1000)
                _uiState.update { it.copy(noiseMeterSecondsRemaining = remaining) }
            }
            stopNoiseMeter()
        }
    }

    fun stopNoiseMeter() {
        noiseMeterJob?.cancel()
        noiseMeterJob = null
        _uiState.update { it.copy(noiseMeterActive = false) }
    }

    // ── Lifecycle ───────────────────────────────────────────────────────

    override fun onCleared() {
        super.onCleared()
        disconnectWebSocket()
        stopNoiseMeter()
    }
}
