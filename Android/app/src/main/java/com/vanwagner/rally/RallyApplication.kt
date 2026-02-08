package com.vanwagner.rally

import android.app.Application
import com.vanwagner.rally.analytics.RallyLogger
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class RallyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        RallyLogger.init(isDebug = BuildConfig.DEBUG)
    }
}
