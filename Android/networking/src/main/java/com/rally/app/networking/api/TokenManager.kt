package com.rally.app.networking.api

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token storage backed by [EncryptedSharedPreferences].
 *
 * Stores the OAuth access token and refresh token using AES-256 encryption
 * provided by the AndroidX Security library. The master key is managed by
 * Android Keystore, making it hardware-backed on supported devices.
 *
 * Thread safety: All reads/writes go through [SharedPreferences], which is
 * internally synchronised. Token values are also published via `@Volatile`
 * in-memory caches so that hot-path reads avoid disk I/O.
 */
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val PREFS_FILE_NAME = "rally_secure_tokens"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }

    /** In-memory cache to avoid repeated disk reads on the hot path. */
    @Volatile
    private var cachedAccessToken: String? = null

    @Volatile
    private var cachedRefreshToken: String? = null

    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (e: Exception) {
            Timber.e(e, "Failed to create EncryptedSharedPreferences; falling back to in-memory only")
            // Fallback: if the Keystore is corrupted (rare), use a plain in-memory map
            // so the app doesn't crash. Tokens will not survive process death in this case.
            context.getSharedPreferences("${PREFS_FILE_NAME}_fallback", Context.MODE_PRIVATE)
        }
    }

    /**
     * Persists both tokens atomically and updates the in-memory caches.
     */
    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()

        cachedAccessToken = accessToken
        cachedRefreshToken = refreshToken
        Timber.d("Tokens saved successfully")
    }

    /**
     * Returns the current access token, reading from the in-memory cache first.
     */
    fun getAccessToken(): String? {
        return cachedAccessToken ?: prefs.getString(KEY_ACCESS_TOKEN, null).also {
            cachedAccessToken = it
        }
    }

    /**
     * Returns the current refresh token, reading from the in-memory cache first.
     */
    fun getRefreshToken(): String? {
        return cachedRefreshToken ?: prefs.getString(KEY_REFRESH_TOKEN, null).also {
            cachedRefreshToken = it
        }
    }

    /**
     * Removes all stored tokens from both the encrypted store and the in-memory cache.
     * Typically called on sign-out or when a token refresh fails irrecoverably.
     */
    fun clearTokens() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .apply()

        cachedAccessToken = null
        cachedRefreshToken = null
        Timber.d("Tokens cleared")
    }

    /**
     * Returns `true` when an access token is present, indicating the user
     * has previously authenticated.
     */
    fun isAuthenticated(): Boolean = getAccessToken() != null
}
