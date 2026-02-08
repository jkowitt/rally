package com.vanwagner.rally.networking.api

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.distinctUntilChanged
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Reactive wrapper around Android's [ConnectivityManager] that exposes
 * the current network state as a Kotlin [Flow].
 *
 * Consumers collect [isOnline] to receive `true`/`false` emissions whenever
 * connectivity changes. The flow is conflated and distinct-until-changed,
 * so rapid network toggles only emit the final settled state.
 *
 * Usage:
 * ```kotlin
 * @Inject lateinit var networkMonitor: NetworkMonitor
 *
 * lifecycleScope.launch {
 *     networkMonitor.isOnline.collect { online ->
 *         if (online) syncPendingData() else showOfflineBanner()
 *     }
 * }
 * ```
 */
@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val connectivityManager: ConnectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    /**
     * A hot [Flow] that emits `true` when the device has internet-capable
     * connectivity and `false` otherwise.
     *
     * The initial value is determined synchronously so that the first
     * emission always reflects the current state.
     */
    val isOnline: Flow<Boolean> = callbackFlow {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()

        val callback = object : ConnectivityManager.NetworkCallback() {
            private val activeNetworks = mutableSetOf<Network>()

            override fun onAvailable(network: Network) {
                activeNetworks.add(network)
                Timber.d("Network available: %s (active count: %d)", network, activeNetworks.size)
                trySend(true)
            }

            override fun onLost(network: Network) {
                activeNetworks.remove(network)
                val online = activeNetworks.isNotEmpty()
                Timber.d("Network lost: %s (active count: %d, online: %b)", network, activeNetworks.size, online)
                trySend(online)
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities,
            ) {
                val hasInternet = networkCapabilities.hasCapability(
                    NetworkCapabilities.NET_CAPABILITY_VALIDATED,
                )
                Timber.v("Capabilities changed for %s: validated=%b", network, hasInternet)
                if (hasInternet) {
                    activeNetworks.add(network)
                } else {
                    activeNetworks.remove(network)
                }
                trySend(activeNetworks.isNotEmpty())
            }
        }

        connectivityManager.registerNetworkCallback(networkRequest, callback)

        // Emit the current state immediately so collectors don't have to wait
        // for the first system callback.
        trySend(isCurrentlyOnline())

        awaitClose {
            Timber.d("Unregistering network callback")
            connectivityManager.unregisterNetworkCallback(callback)
        }
    }
        .distinctUntilChanged()
        .conflate()

    /**
     * Synchronous point-in-time check for internet connectivity.
     * Prefer collecting [isOnline] for reactive updates.
     */
    fun isCurrentlyOnline(): Boolean {
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
