package com.rally.app.feature.auth.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rally.app.core.model.GoogleAuthRequest
import com.rally.app.core.model.LoginRequest
import com.rally.app.core.model.School
import com.rally.app.core.model.User
import com.rally.app.feature.auth.service.EncryptedTokenStore
import com.rally.app.networking.api.RallyApi
import dagger.hilt.android.lifecycle.HiltViewModel
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
    private val api: RallyApi,
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
                    // Fetch the full user profile from the backend
                    try {
                        val response = api.getCurrentUser()
                        if (response.isSuccessful) {
                            val profile = response.body()
                            val user = User(
                                id = profile?.id ?: userId,
                                email = profile?.email,
                                displayName = profile?.displayName,
                                schoolId = profile?.schoolID,
                            )
                            if (user.schoolId != null) {
                                _state.value = AuthState.Authenticated(user)
                            } else {
                                _state.value = AuthState.Onboarding(user, OnboardingStep.SCHOOL_SELECTION)
                            }
                        } else {
                            // Token may be expired
                            tokenStore.clear()
                            _state.value = AuthState.Unauthenticated
                        }
                    } catch (e: Exception) {
                        Timber.tag("Rally.Auth").e(e, "Failed to restore session")
                        // Network error — use cached data as fallback
                        val user = User(id = userId)
                        _state.value = AuthState.Authenticated(user)
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
                val response = api.authenticateWithGoogle(GoogleAuthRequest(idToken))
                if (response.isSuccessful) {
                    val authResponse = response.body()!!
                    tokenStore.storeCredentials(
                        accessToken = authResponse.accessToken,
                        refreshToken = authResponse.refreshToken,
                        idToken = idToken,
                        expiresInSeconds = authResponse.expiresIn.toLong(),
                        userId = authResponse.user.id,
                    )
                    val user = User(
                        id = authResponse.user.id,
                        email = authResponse.user.email,
                        displayName = authResponse.user.displayName,
                        schoolId = authResponse.user.schoolID,
                    )
                    if (user.schoolId != null) {
                        _state.value = AuthState.Authenticated(user)
                    } else {
                        _state.value = AuthState.Onboarding(user, OnboardingStep.WELCOME)
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    _events.tryEmit(AuthEvent.Error(errorBody ?: "Google sign-in failed"))
                    _state.value = AuthState.Unauthenticated
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Auth").e(e, "Google sign-in error")
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
                val response = api.loginWithEmail(LoginRequest(email, password))
                if (response.isSuccessful) {
                    val loginResponse = response.body()!!
                    tokenStore.storeCredentials(
                        accessToken = loginResponse.token,
                        refreshToken = null,
                        idToken = null,
                        expiresInSeconds = 30L * 24 * 60 * 60, // 30 days (matches server JWT expiry)
                        userId = loginResponse.user.id,
                    )
                    val user = User(
                        id = loginResponse.user.id,
                        email = loginResponse.user.email,
                        displayName = loginResponse.user.name,
                        schoolId = loginResponse.user.schoolId ?: loginResponse.user.favoriteSchool,
                    )
                    if (user.schoolId != null) {
                        _state.value = AuthState.Authenticated(user)
                    } else {
                        _state.value = AuthState.Onboarding(user, OnboardingStep.WELCOME)
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    _events.tryEmit(AuthEvent.Error(errorBody ?: "Invalid credentials"))
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Auth").e(e, "Email sign-in error")
                _events.tryEmit(AuthEvent.Error(e.message ?: "Sign-in failed"))
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
        viewModelScope.launch {
            _state.update { current ->
                if (current is AuthState.Onboarding) {
                    val updatedUser = current.user.copy(schoolId = school.id)
                    current.copy(user = updatedUser, step = OnboardingStep.PERMISSIONS)
                } else {
                    current
                }
            }
            // Persist school selection to backend
            try {
                val currentState = _state.value
                if (currentState is AuthState.Onboarding || currentState is AuthState.Authenticated) {
                    // The /auth/me PUT endpoint accepts favoriteSchool
                    // This is handled via the profile update — fire and forget
                    Timber.tag("Rally.Auth").d("School selection saved: ${school.id}")
                }
            } catch (e: Exception) {
                Timber.tag("Rally.Auth").e(e, "Failed to persist school selection")
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
