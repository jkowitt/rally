package com.vanwagner.rally.analytics.di

import com.vanwagner.rally.analytics.AnalyticsManager
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
