package com.vanwagner.rally.feature.loyalty.di

import com.vanwagner.rally.feature.loyalty.engine.PointsEngine
import com.vanwagner.rally.networking.api.RallyApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module that provides loyalty-specific dependencies scoped to the
 * application [SingletonComponent] so that [PointsEngine] survives
 * configuration changes and is shared across all ViewModels.
 */
@Module
@InstallIn(SingletonComponent::class)
object LoyaltyModule {

    @Provides
    @Singleton
    fun providePointsEngine(
        api: RallyApi,
    ): PointsEngine = PointsEngine(api)
}
