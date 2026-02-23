package com.rally.app.networking.api

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.rally.app.networking.BuildConfig
import com.rally.app.networking.interceptor.AuthInterceptor
import com.rally.app.networking.interceptor.RetryInterceptor
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * Singleton factory for building the OkHttpClient and Retrofit instances
 * used throughout the networking layer.
 *
 * Production code should obtain instances via Hilt ([com.rally.app.networking.di.NetworkModule]),
 * but this object is exposed for tests and manual configuration.
 */
object ApiClient {

    private const val CONNECT_TIMEOUT_SECONDS = 30L
    private const val READ_TIMEOUT_SECONDS = 30L
    private const val WRITE_TIMEOUT_SECONDS = 30L

    /**
     * Shared [Json] configuration used for both Retrofit serialization
     * and manual parsing throughout the networking module.
     */
    val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        explicitNulls = false
        coerceInputValues = true
    }

    /**
     * Creates a configured [HttpLoggingInterceptor] that routes output through Timber.
     * Logging level is BODY in debug builds and NONE in release builds.
     */
    fun createLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor { message ->
            Timber.tag("RallyHttp").d(message)
        }.apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    /**
     * Builds an [OkHttpClient] wired with authentication, retry, and logging interceptors.
     *
     * Interceptor ordering:
     * 1. [AuthInterceptor] -- injects Bearer token & handles 401 refresh
     * 2. [RetryInterceptor] -- exponential back-off for transient failures
     * 3. [HttpLoggingInterceptor] -- logs final outgoing request (last in chain)
     */
    fun createOkHttpClient(
        authInterceptor: AuthInterceptor,
        retryInterceptor: RetryInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(retryInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    /**
     * Builds a [Retrofit] instance configured with the Rally base URL and
     * kotlinx.serialization JSON converter.
     */
    fun createRetrofit(
        okHttpClient: OkHttpClient,
        baseUrl: String = BuildConfig.API_BASE_URL,
    ): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(baseUrl.ensureTrailingSlash())
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    /**
     * Creates the [RallyApi] Retrofit service from the supplied [Retrofit] instance.
     */
    fun createRallyApi(retrofit: Retrofit): RallyApi {
        return retrofit.create(RallyApi::class.java)
    }

    /**
     * Ensures the base URL ends with a `/` as required by Retrofit.
     */
    private fun String.ensureTrailingSlash(): String =
        if (endsWith("/")) this else "$this/"
}
