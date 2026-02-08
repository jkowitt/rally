package com.vanwagner.rally.feature.auth.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vanwagner.rally.core.model.School
import com.vanwagner.rally.core.model.User
import com.vanwagner.rally.feature.auth.service.EncryptedTokenStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── Auth State ──────────────────────────────────────────────────────────

/** Represents every possible authentication lifecycle state. */
sealed interface AuthState {
    /** Initial state while we check the keystore. */
    data object Unknown : AuthState

    /** No valid credentials; show sign-in. */
    data object Unauthenticated : AuthState

    /** Credentials exist but onboarding (school pick, permissions) is incomplete. */
    data class Onboarding(
        val user: User,
        val step: OnboardingStep = OnboardingStep.WELCOME,
    ) : AuthState

    /** Fully signed-in and onboarded. */
    data class Authenticated(val user: User) : AuthState
}

enum class OnboardingStep { WELCOME, SCHOOL_SELECTION, PERMISSIONS }

// ── One-shot Events ─────────────────────────────────────────────────────

sealed interface AuthEvent {
    data class Error(val message: String) : AuthEvent
    data object SignedOut : AuthEvent
}

// ── ViewModel ───────────────────────────────────────────────────────────

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val tokenStore: EncryptedTokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow<AuthState>(AuthState.Unknown)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<AuthEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<AuthEvent> = _events.asSharedFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        restoreSession()
    }

    // ── Session Restoration ─────────────────────────────────────────────

    private fun restoreSession() {
        viewModelScope.launch {
            if (tokenStore.hasValidToken) {
                val userId = tokenStore.userId
                if (userId != null) {
                    val user = User(id = userId)
                    // TODO: fetch full user profile from network
                    if (user.schoolId != null) {
                        _state.value = AuthState.Authenticated(user)
                    } else {
                        _state.value = AuthState.Onboarding(user, OnboardingStep.SCHOOL_SELECTION)
                    }
                } else {
                    _state.value = AuthState.Unauthenticated
                }
            } else {
                _state.value = AuthState.Unauthenticated
            }
        }
    }

    // ── Google Sign-In ──────────────────────────────────────────────────

    /**
     * Called when Google Sign-In completes successfully.
     *
     * @param idToken   the JWT from Google
     * @param email     user email
     * @param displayName optional display name
     */
    fun onGoogleSignInSuccess(idToken: String, email: String, displayName: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // TODO: exchange Google idToken with Rally backend for access/refresh tokens
                val fakeAccessToken = "rally_access_${System.currentTimeMillis()}"
                val fakeUserId = email // placeholder
                tokenStore.storeCredentials(
                    accessToken = fakeAccessToken,
                    refreshToken = null,
                    idToken = idToken,
                    expiresInSeconds = 3_600L,
                    userId = fakeUserId,
                )
                val user = User(
                    id = fakeUserId,
                    email = email,
                    displayName = displayName,
                )
                _state.value = AuthState.Onboarding(user, OnboardingStep.WELCOME)
            } catch (e: Exception) {
                _events.tryEmit(AuthEvent.Error(e.message ?: "Google sign-in failed"))
                _state.value = AuthState.Unauthenticated
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ── Email Sign-In ───────────────────────────────────────────────────

    fun signInWithEmail(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // TODO: call Rally backend /auth/email
                val fakeAccessToken = "rally_email_${System.currentTimeMillis()}"
                tokenStore.storeCredentials(
                    accessToken = fakeAccessToken,
                    refreshToken = null,
                    idToken = null,
                    expiresInSeconds = 3_600L,
                    userId = email,
                )
                val user = User(id = email, email = email)
                _state.value = AuthState.Onboarding(user, OnboardingStep.WELCOME)
            } catch (e: Exception) {
                _events.tryEmit(AuthEvent.Error(e.message ?: "Email sign-in failed"))
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ── Onboarding Progression ──────────────────────────────────────────

    fun advanceOnboarding() {
        _state.update { current ->
            if (current is AuthState.Onboarding) {
                when (current.step) {
                    OnboardingStep.WELCOME -> current.copy(step = OnboardingStep.SCHOOL_SELECTION)
                    OnboardingStep.SCHOOL_SELECTION -> current.copy(step = OnboardingStep.PERMISSIONS)
                    OnboardingStep.PERMISSIONS -> AuthState.Authenticated(current.user)
                }
            } else {
                current
            }
        }
    }

    fun selectSchool(school: School) {
        _state.update { current ->
            if (current is AuthState.Onboarding) {
                val updatedUser = current.user.copy(schoolId = school.id)
                // TODO: persist school selection to backend
                current.copy(user = updatedUser, step = OnboardingStep.PERMISSIONS)
            } else {
                current
            }
        }
    }

    // ── Sign Out ────────────────────────────────────────────────────────

    fun signOut() {
        viewModelScope.launch {
            tokenStore.clear()
            _state.value = AuthState.Unauthenticated
            _events.tryEmit(AuthEvent.SignedOut)
        }
    }
}
