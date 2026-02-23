package com.rally.app.analytics.di

import com.rally.app.analytics.AnalyticsManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AnalyticsModule {

    @Provides
    @Singleton
    fun provideAnalyticsManager(): AnalyticsManager = AnalyticsManager()
}
