package com.vanwagner.rally.feature.loyalty.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vanwagner.rally.core.model.PointsTransaction
import com.vanwagner.rally.feature.loyalty.engine.PointsEngine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PointsHistoryViewModel @Inject constructor(
    private val pointsEngine: PointsEngine,
) : ViewModel() {

    // ---- internal mutable state -------------------------------------------------

    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)
    private val _selectedFilter = MutableStateFlow(TransactionFilter.All)

    // ---- filter options ----------------------------------------------------------

    enum class TransactionFilter(val label: String) {
        All("All"),
        Earned("Earned"),
        Redeemed("Redeemed"),
    }

    // ---- public UI state --------------------------------------------------------

    data class UiState(
        val transactions: List<PointsTransaction> = emptyList(),
        val totalPoints: Int = 0,
        val isLoading: Boolean = false,
        val error: String? = null,
        val selectedFilter: TransactionFilter = TransactionFilter.All,
    )

    val uiState: StateFlow<UiState> = combine(
        pointsEngine.transactions,
        pointsEngine.currentPoints,
        _isLoading,
        _error,
        _selectedFilter,
    ) { transactions, totalPoints, isLoading, error, filter ->
        val filtered = when (filter) {
            TransactionFilter.All -> transactions
            TransactionFilter.Earned -> transactions.filter { it.amount > 0 }
            TransactionFilter.Redeemed -> transactions.filter { it.amount < 0 }
        }
        UiState(
            transactions = filtered,
            totalPoints = totalPoints,
            isLoading = isLoading,
            error = error,
            selectedFilter = filter,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UiState(),
    )

    // ---- lifecycle ---------------------------------------------------------------

    init {
        loadHistory()
    }

    // ---- public actions ----------------------------------------------------------

    fun loadHistory() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                pointsEngine.fetchHistory()
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to load history"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun setFilter(filter: TransactionFilter) {
        _selectedFilter.value = filter
    }
}
