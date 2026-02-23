package com.rally.app.feature.auth.di

import android.content.Context
import com.rally.app.feature.auth.service.EncryptedTokenStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideEncryptedTokenStore(
        @ApplicationContext context: Context,
    ): EncryptedTokenStore = EncryptedTokenStore(context)
}
