package com.rally.app.feature.auth.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rally.app.core.model.School
import com.rally.app.networking.api.RallyApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class SchoolListViewModel @Inject constructor(
    private val api: RallyApi,
) : ViewModel() {

    private val _schools = MutableStateFlow<List<School>>(emptyList())
    val schools: StateFlow<List<School>> = _schools.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private var loaded = false

    fun loadSchools() {
        if (loaded) return
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val response = api.getSchools()
                if (response.isSuccessful) {
                    _schools.value = response.body() ?: emptyList()
                    loaded = true
                } else {
                    _error.value = "Failed to load schools (${response.code()})"
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Schools").e(e, "Failed to fetch schools")
                _error.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
