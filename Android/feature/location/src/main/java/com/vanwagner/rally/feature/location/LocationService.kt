package com.vanwagner.rally.feature.location

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.vanwagner.rally.core.model.Venue
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Wrapper around [FusedLocationProviderClient] and [GeofencingClient] that provides
 * reactive location updates and venue geofence management.
 */
@Singleton
class LocationService @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "LocationService"
        private const val GEOFENCE_RADIUS_METERS = 200f
        private const val GEOFENCE_EXPIRATION_MS = 12L * 60 * 60 * 1_000 // 12 hours
        private const val LOCATION_INTERVAL_MS = 30_000L
        private const val LOCATION_FASTEST_INTERVAL_MS = 10_000L
    }

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val geofencingClient: GeofencingClient =
        LocationServices.getGeofencingClient(context)

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
        PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    // ── Continuous Location Updates ─────────────────────────────────────

    /**
     * Emits location updates as a cold [Flow]. Collection automatically starts
     * and stops the underlying FusedLocationProvider callbacks.
     */
    fun locationUpdates(): Flow<android.location.Location> = callbackFlow {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Location permission not granted; closing flow.")
            close()
            return@callbackFlow
        }

        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            LOCATION_INTERVAL_MS,
        )
            .setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL_MS)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { trySend(it) }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, callback, context.mainLooper)
        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException requesting location updates", se)
            close(se)
            return@callbackFlow
        }

        awaitClose {
            fusedClient.removeLocationUpdates(callback)
        }
    }

    // ── Last Known Location ─────────────────────────────────────────────

    /**
     * Returns the last known location or `null`. Non-blocking, but may return stale data.
     */
    suspend fun lastLocation(): android.location.Location? {
        if (!hasLocationPermission()) return null
        return try {
            com.google.android.gms.tasks.Tasks.await(fusedClient.lastLocation)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get last location", e)
            null
        }
    }

    // ── Geofencing ──────────────────────────────────────────────────────

    /**
     * Register geofences for a list of [Venue]s. Existing geofences are replaced.
     */
    fun registerVenueGeofences(venues: List<Venue>) {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Cannot register geofences without location permission")
            return
        }

        if (!hasBackgroundLocationPermission()) {
            Log.w(TAG, "Background location permission not granted; geofences may not fire in background")
        }

        val geofences = venues.map { venue ->
            Geofence.Builder()
                .setRequestId(venue.id)
                .setCircularRegion(venue.latitude, venue.longitude, GEOFENCE_RADIUS_METERS)
                .setExpirationDuration(GEOFENCE_EXPIRATION_MS)
                .setTransitionTypes(
                    Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT,
                )
                .build()
        }

        if (geofences.isEmpty()) return

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofences)
            .build()

        try {
            geofencingClient.addGeofences(request, geofencePendingIntent)
                .addOnSuccessListener {
                    Log.d(TAG, "Registered ${geofences.size} venue geofences")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Failed to register geofences", e)
                }
        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException adding geofences", se)
        }
    }

    /** Remove all registered venue geofences. */
    fun removeAllGeofences() {
        geofencingClient.removeGeofences(geofencePendingIntent)
            .addOnSuccessListener { Log.d(TAG, "All geofences removed") }
            .addOnFailureListener { e -> Log.e(TAG, "Failed to remove geofences", e) }
    }

    /** Remove geofences for specific venue IDs. */
    fun removeGeofences(venueIds: List<String>) {
        if (venueIds.isEmpty()) return
        geofencingClient.removeGeofences(venueIds)
            .addOnSuccessListener { Log.d(TAG, "Removed geofences: $venueIds") }
            .addOnFailureListener { e -> Log.e(TAG, "Failed to remove geofences: $venueIds", e) }
    }

    // ── Permission Helpers ──────────────────────────────────────────────

    private fun hasLocationPermission(): Boolean =
        ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    private fun hasBackgroundLocationPermission(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // pre-Q doesn't require explicit background permission
        }
}
