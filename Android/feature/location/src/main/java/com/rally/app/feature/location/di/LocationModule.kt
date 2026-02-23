package com.rally.app.feature.location.di

import android.content.Context
import com.rally.app.feature.location.BeaconScanner
import com.rally.app.feature.location.LocationService
import com.rally.app.feature.location.VenueDetector
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object LocationModule {

    @Provides
    @Singleton
    fun provideLocationService(
        @ApplicationContext context: Context,
    ): LocationService = LocationService(context)

    @Provides
    @Singleton
    fun provideBeaconScanner(
        @ApplicationContext context: Context,
    ): BeaconScanner = BeaconScanner(context)

    @Provides
    @Singleton
    fun provideVenueDetector(
        locationService: LocationService,
        beaconScanner: BeaconScanner,
    ): VenueDetector = VenueDetector(locationService, beaconScanner)
}
