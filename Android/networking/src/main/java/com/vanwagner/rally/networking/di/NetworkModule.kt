package com.vanwagner.rally.networking.di

import android.content.Context
import com.vanwagner.rally.networking.api.ApiClient
import com.vanwagner.rally.networking.api.NetworkMonitor
import com.vanwagner.rally.networking.api.RallyApi
import com.vanwagner.rally.networking.api.TokenManager
import com.vanwagner.rally.networking.interceptor.AuthInterceptor
import com.vanwagner.rally.networking.interceptor.RetryInterceptor
import com.vanwagner.rally.networking.websocket.GamedayWebSocket
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import javax.inject.Singleton

/**
 * Hilt module that provides all networking-layer dependencies.
 *
 * All bindings are scoped to [SingletonComponent] so that a single
 * [OkHttpClient], [Retrofit], and [RallyApi] instance are shared
 * across the entire application.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideTokenManager(
        @ApplicationContext context: Context,
    ): TokenManager {
        return TokenManager(context)
    }

    @Provides
    @Singleton
    fun provideAuthInterceptor(
        tokenManager: TokenManager,
    ): AuthInterceptor {
        return AuthInterceptor(tokenManager)
    }

    @Provides
    @Singleton
    fun provideRetryInterceptor(): RetryInterceptor {
        return RetryInterceptor()
    }

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return ApiClient.createLoggingInterceptor()
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        retryInterceptor: RetryInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
    ): OkHttpClient {
        return ApiClient.createOkHttpClient(
            authInterceptor = authInterceptor,
            retryInterceptor = retryInterceptor,
            loggingInterceptor = loggingInterceptor,
        )
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
    ): Retrofit {
        return ApiClient.createRetrofit(okHttpClient)
    }

    @Provides
    @Singleton
    fun provideRallyApi(
        retrofit: Retrofit,
    ): RallyApi {
        return ApiClient.createRallyApi(retrofit)
    }

    @Provides
    @Singleton
    fun provideNetworkMonitor(
        @ApplicationContext context: Context,
    ): NetworkMonitor {
        return NetworkMonitor(context)
    }

    @Provides
    @Singleton
    fun provideGamedayWebSocket(
        okHttpClient: OkHttpClient,
        tokenManager: TokenManager,
    ): GamedayWebSocket {
        return GamedayWebSocket(okHttpClient, tokenManager)
    }
}
