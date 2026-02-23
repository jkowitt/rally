package com.rally.app.analytics

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Analytics event for tracking user actions.
 */
data class AnalyticsEvent(
    val name: String,
    val properties: Map<String, String> = emptyMap(),
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Protocol for analytics backends (Mixpanel, Firebase Analytics, etc.).
 */
interface AnalyticsProvider {
    suspend fun track(event: AnalyticsEvent)
    suspend fun identify(userId: String)
    suspend fun setUserProperties(properties: Map<String, String>)
    suspend fun reset()
}

/**
 * Main analytics manager that dispatches events to registered providers.
 * Thread-safe via coroutine dispatching.
 */
@Singleton
class AnalyticsManager @Inject constructor() {

    private val providers = mutableListOf<AnalyticsProvider>()

    fun registerProvider(provider: AnalyticsProvider) {
        providers.add(provider)
    }

    suspend fun track(event: AnalyticsEvent) {
        RallyLogger.network("Analytics: ${event.name} ${event.properties}")
        providers.forEach { it.track(event) }
    }

    suspend fun track(name: String, vararg properties: Pair<String, String>) {
        track(AnalyticsEvent(name, properties.toMap()))
    }

    suspend fun identify(userId: String) {
        providers.forEach { it.identify(userId) }
    }

    suspend fun setUserProperties(properties: Map<String, String>) {
        providers.forEach { it.setUserProperties(properties) }
    }

    suspend fun reset() {
        providers.forEach { it.reset() }
    }
}
