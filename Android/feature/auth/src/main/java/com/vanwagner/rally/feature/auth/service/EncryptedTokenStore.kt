package com.vanwagner.rally.feature.auth.service

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token storage backed by EncryptedSharedPreferences.
 *
 * All tokens are encrypted at rest using AES-256 GCM via the Android Keystore-backed
 * [MasterKey]. Callers should never persist tokens in plain SharedPreferences or files.
 */
@Singleton
class EncryptedTokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private companion object {
        const val PREFS_FILE = "rally_encrypted_prefs"
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_ID_TOKEN = "id_token"
        const val KEY_TOKEN_EXPIRY = "token_expiry"
        const val KEY_USER_ID = "user_id"
    }

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    // ── Access Token ────────────────────────────────────────────────────

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_ACCESS_TOKEN, value).apply()

    // ── Refresh Token ───────────────────────────────────────────────────

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_REFRESH_TOKEN, value).apply()

    // ── ID Token (Google/Apple Sign-In) ────────────────────────────────

    var idToken: String?
        get() = prefs.getString(KEY_ID_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_ID_TOKEN, value).apply()

    // ── Token Expiry (epoch millis) ────────────────────────────────────

    var tokenExpiryMillis: Long
        get() = prefs.getLong(KEY_TOKEN_EXPIRY, 0L)
        set(value) = prefs.edit().putLong(KEY_TOKEN_EXPIRY, value).apply()

    // ── User ID ────────────────────────────────────────────────────────

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) = prefs.edit().putString(KEY_USER_ID, value).apply()

    // ── Convenience ────────────────────────────────────────────────────

    /** `true` when a non-null access token exists and has not expired. */
    val hasValidToken: Boolean
        get() {
            val token = accessToken ?: return false
            if (token.isBlank()) return false
            val expiry = tokenExpiryMillis
            return expiry == 0L || System.currentTimeMillis() < expiry
        }

    /** Persist a complete credential set atomically. */
    fun storeCredentials(
        accessToken: String,
        refreshToken: String?,
        idToken: String?,
        expiresInSeconds: Long,
        userId: String,
    ) {
        val expiryMillis = if (expiresInSeconds > 0) {
            System.currentTimeMillis() + (expiresInSeconds * 1_000)
        } else {
            0L
        }
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_ID_TOKEN, idToken)
            .putLong(KEY_TOKEN_EXPIRY, expiryMillis)
            .putString(KEY_USER_ID, userId)
            .apply()
    }

    /** Wipe every stored credential. Called on sign-out. */
    fun clear() {
        prefs.edit().clear().apply()
    }
}
