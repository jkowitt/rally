package com.rally.app.networking.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber
import java.io.IOException
import java.net.HttpURLConnection
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that implements exponential back-off retry logic for
 * transient network and server errors.
 *
 * Retry policy:
 * - Maximum of [MAX_RETRIES] attempts (3).
 * - Delays: 1 s, 2 s, 4 s (exponential with base [INITIAL_DELAY_MS]).
 * - Retries on IOExceptions (network errors) and 5xx server errors.
 * - 4xx client errors are **not** retried, with two exceptions:
 *   - **401 Unauthorized** -- may succeed after a token refresh by [AuthInterceptor].
 *   - **429 Too Many Requests** -- honours the server's rate-limit signal.
 */
@Singleton
class RetryInterceptor @Inject constructor() : Interceptor {

    companion object {
        private const val MAX_RETRIES = 3
        private const val INITIAL_DELAY_MS = 1_000L
        private const val BACKOFF_MULTIPLIER = 2.0
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var lastException: IOException? = null
        var response: Response? = null

        for (attempt in 0..MAX_RETRIES) {
            // Apply exponential delay before retry attempts (skip on first try).
            if (attempt > 0) {
                val delayMs = (INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, (attempt - 1).toDouble())).toLong()
                Timber.d("Retry attempt %d/%d after %d ms for %s", attempt, MAX_RETRIES, delayMs, request.url)
                try {
                    Thread.sleep(delayMs)
                } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                    throw IOException("Retry interrupted", lastException)
                }
            }

            try {
                // Close the previous unsuccessful response body before retrying.
                response?.close()
                response = chain.proceed(request)

                if (response.isSuccessful || !shouldRetry(response.code)) {
                    return response
                }

                Timber.w("Received HTTP %d for %s (attempt %d/%d)", response.code, request.url, attempt + 1, MAX_RETRIES + 1)
            } catch (e: IOException) {
                lastException = e
                Timber.w(e, "IOException for %s (attempt %d/%d)", request.url, attempt + 1, MAX_RETRIES + 1)

                // On the last attempt, propagate the exception.
                if (attempt == MAX_RETRIES) {
                    throw e
                }
            }
        }

        // If we exhausted all retries but had a response, return it.
        return response ?: throw (lastException ?: IOException("Unknown retry failure"))
    }

    /**
     * Determines whether a request should be retried based on the HTTP status code.
     *
     * - 5xx: always retry (server error / transient).
     * - 401: retry (token may have been refreshed by [AuthInterceptor]).
     * - 429: retry (rate limited; back-off gives the server breathing room).
     * - All other 4xx: do **not** retry (client error, request is fundamentally wrong).
     */
    private fun shouldRetry(statusCode: Int): Boolean {
        return when {
            statusCode >= 500 -> true
            statusCode == HttpURLConnection.HTTP_UNAUTHORIZED -> true   // 401
            statusCode == 429 -> true                                   // Too Many Requests
            else -> false
        }
    }
}
