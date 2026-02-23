package com.rally.app.analytics

import timber.log.Timber

/**
 * Structured logger for the Rally app using Timber.
 * Each module gets its own tagged logger for filtering.
 */
object RallyLogger {

    fun init(isDebug: Boolean) {
        if (isDebug) {
            Timber.plant(Timber.DebugTree())
        }
        // Production: plant a CrashReporting tree (Firebase Crashlytics, etc.)
    }

    fun auth(message: String, vararg args: Any?) = Timber.tag("Rally.Auth").d(message, *args)
    fun network(message: String, vararg args: Any?) = Timber.tag("Rally.Network").d(message, *args)
    fun gameday(message: String, vararg args: Any?) = Timber.tag("Rally.Gameday").d(message, *args)
    fun loyalty(message: String, vararg args: Any?) = Timber.tag("Rally.Loyalty").d(message, *args)
    fun location(message: String, vararg args: Any?) = Timber.tag("Rally.Location").d(message, *args)
    fun content(message: String, vararg args: Any?) = Timber.tag("Rally.Content").d(message, *args)
    fun sponsor(message: String, vararg args: Any?) = Timber.tag("Rally.Sponsor").d(message, *args)
    fun ui(message: String, vararg args: Any?) = Timber.tag("Rally.UI").d(message, *args)

    fun error(tag: String, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Timber.tag("Rally.$tag").e(throwable, message)
        } else {
            Timber.tag("Rally.$tag").e(message)
        }
    }

    fun warn(tag: String, message: String) = Timber.tag("Rally.$tag").w(message)
}
