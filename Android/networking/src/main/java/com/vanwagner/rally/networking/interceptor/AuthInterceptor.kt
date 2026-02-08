package com.vanwagner.rally.networking.interceptor

import com.vanwagner.rally.core.model.RefreshTokenRequest
import com.vanwagner.rally.core.model.TokenPair
import com.vanwagner.rally.networking.api.ApiClient
import com.vanwagner.rally.networking.api.TokenManager
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import timber.log.Timber
import java.net.HttpURLConnection
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that manages Bearer-token authentication.
 *
 * Responsibilities:
 * - Attaches the current access token to every outgoing request via the `Authorization` header.
 * - When a 401 response is received, transparently refreshes the token pair and retries the
 *   original request exactly once.
 * - Serializes concurrent refresh attempts so that only one network call is made; all other
 *   threads wait and then re-use the new token.
 *
 * Requests targeting the `auth/` path are excluded from token injection to avoid
 * circular dependencies during login and refresh flows.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
) : Interceptor {

    /** Lock object used to serialize concurrent token refresh attempts. */
    private val refreshLock = Any()

    /**
     * Snapshot of the token that was active when a refresh was last triggered.
     * Used to detect whether another thread already completed a refresh so we
     * can skip a redundant network call.
     */
    @Volatile
    private var tokenBeingRefreshed: String? = null

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth header injection for authentication endpoints.
        if (originalRequest.url.encodedPath.contains("auth/")) {
            return chain.proceed(originalRequest)
        }

        val accessToken = tokenManager.getAccessToken()
        val authenticatedRequest = originalRequest.withBearerToken(accessToken)
        val response = chain.proceed(authenticatedRequest)

        // If the response is not 401 or we have no refresh token, return as-is.
        if (response.code != HttpURLConnection.HTTP_UNAUTHORIZED) {
            return response
        }

        val refreshToken = tokenManager.getRefreshToken() ?: return response

        // Attempt a synchronised token refresh.
        val newAccessToken = refreshAccessToken(accessToken, refreshToken)
            ?: return response // Refresh failed; return the original 401.

        // Close the original 401 body before retrying.
        response.close()

        // Retry the original request with the new token.
        val retriedRequest = originalRequest.withBearerToken(newAccessToken)
        return chain.proceed(retriedRequest)
    }

    /**
     * Attempts to obtain a fresh access token. If another thread already refreshed
     * the token while we were waiting on the lock, reuses the new token without
     * making a redundant network call.
     *
     * @param staleAccessToken The token that triggered the 401.
     * @param refreshToken The refresh token to exchange for a new token pair.
     * @return The new access token, or `null` if the refresh failed.
     */
    private fun refreshAccessToken(staleAccessToken: String?, refreshToken: String): String? {
        synchronized(refreshLock) {
            // If the stored token has already changed, another thread completed the refresh.
            val currentToken = tokenManager.getAccessToken()
            if (currentToken != staleAccessToken && currentToken != null) {
                Timber.d("Token already refreshed by another thread")
                return currentToken
            }

            // Guard against re-entrant refresh for the same stale token.
            if (tokenBeingRefreshed == staleAccessToken) {
                Timber.w("Duplicate refresh attempt for same stale token; skipping")
                return tokenManager.getAccessToken()
            }
            tokenBeingRefreshed = staleAccessToken

            return try {
                val newTokenPair = executeRefreshCall(refreshToken)
                if (newTokenPair != null) {
                    tokenManager.saveTokens(newTokenPair.accessToken, newTokenPair.refreshToken)
                    Timber.d("Token refresh successful")
                    newTokenPair.accessToken
                } else {
                    Timber.w("Token refresh returned null; clearing tokens")
                    tokenManager.clearTokens()
                    null
                }
            } catch (e: Exception) {
                Timber.e(e, "Token refresh failed")
                tokenManager.clearTokens()
                null
            } finally {
                tokenBeingRefreshed = null
            }
        }
    }

    /**
     * Performs a synchronous HTTP call to the refresh endpoint.
     *
     * This intentionally creates its own minimal OkHttp client so that the
     * request does not flow back through this interceptor (avoiding recursion).
     */
    private fun executeRefreshCall(refreshToken: String): TokenPair? {
        val json = ApiClient.json
        val requestBody = json.encodeToString(
            RefreshTokenRequest.serializer(),
            RefreshTokenRequest(refreshToken),
        )
        val mediaType = "application/json".toMediaType()

        val request = Request.Builder()
            .url("${getBaseUrl()}auth/refresh")
            .post(requestBody.toRequestBody(mediaType))
            .build()

        // Use a plain client with no interceptors to avoid infinite loops.
        val plainClient = okhttp3.OkHttpClient.Builder().build()
        val response = plainClient.newCall(request).execute()

        return if (response.isSuccessful) {
            response.body?.string()?.let { body ->
                json.decodeFromString(TokenPair.serializer(), body)
            }
        } else {
            Timber.w("Refresh endpoint returned HTTP ${response.code}")
            response.close()
            null
        }
    }

    private fun getBaseUrl(): String {
        val url = com.vanwagner.rally.networking.BuildConfig.API_BASE_URL
        return if (url.endsWith("/")) url else "$url/"
    }

    private fun Request.withBearerToken(token: String?): Request {
        if (token.isNullOrBlank()) return this
        return newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
    }
}
