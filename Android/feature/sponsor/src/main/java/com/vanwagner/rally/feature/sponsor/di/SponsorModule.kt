package com.vanwagner.rally.feature.sponsor.di

import com.vanwagner.rally.feature.sponsor.service.ImpressionTracker
import com.vanwagner.rally.feature.sponsor.service.SponsorManager
import com.vanwagner.rally.networking.api.RallyApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that provides sponsor-related singletons to the
 * application-level dependency graph.
 */
@Module
@InstallIn(SingletonComponent::class)
object SponsorModule {

    /**
     * Provides a singleton [SponsorManager] backed by the app-wide
     * [RallyApi] instance.
     */
    @Provides
    @Singleton
    fun provideSponsorManager(api: RallyApi): SponsorManager {
        return SponsorManager(api)
    }

    /**
     * Provides a singleton [ImpressionTracker] backed by the app-wide
     * [RallyApi] instance.
     */
    @Provides
    @Singleton
    fun provideImpressionTracker(api: RallyApi): ImpressionTracker {
        return ImpressionTracker(api)
    }
}
