package com.rally.app

import android.app.Application
import com.rally.app.analytics.RallyLogger
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class RallyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        RallyLogger.init(isDebug = BuildConfig.DEBUG)
    }
}
