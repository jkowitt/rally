package com.vanwagner.rally.feature.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofenceStatusCodes
import com.google.android.gms.location.GeofencingEvent
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * [BroadcastReceiver] that handles geofence transition events fired by
 * [com.google.android.gms.location.GeofencingClient].
 *
 * Registered as a PendingIntent target in [LocationService]. Each transition
 * is forwarded to [VenueDetector] which fuses the signal with beacon data.
 *
 * Must be declared in AndroidManifest.xml:
 * ```xml
 * <receiver
 *     android:name=".feature.location.GeofenceBroadcastReceiver"
 *     android:exported="false" />
 * ```
 */
@AndroidEntryPoint
class GeofenceBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "GeofenceBroadcastRx"
    }

    @Inject
    lateinit var venueDetector: VenueDetector

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent)

        if (geofencingEvent == null) {
            Log.w(TAG, "Received null GeofencingEvent")
            return
        }

        if (geofencingEvent.hasError()) {
            val errorMessage = GeofenceStatusCodes.getStatusCodeString(geofencingEvent.errorCode)
            Log.e(TAG, "Geofencing error: $errorMessage (code=${geofencingEvent.errorCode})")
            return
        }

        val transitionType = geofencingEvent.geofenceTransition
        val triggeringGeofences = geofencingEvent.triggeringGeofences

        if (triggeringGeofences.isNullOrEmpty()) {
            Log.w(TAG, "Geofence transition with no triggering geofences")
            return
        }

        when (transitionType) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> {
                for (geofence in triggeringGeofences) {
                    val venueId = geofence.requestId
                    Log.d(TAG, "ENTER transition for venue: $venueId")
                    venueDetector.onGeofenceEnter(venueId)
                }
            }

            Geofence.GEOFENCE_TRANSITION_EXIT -> {
                for (geofence in triggeringGeofences) {
                    val venueId = geofence.requestId
                    Log.d(TAG, "EXIT transition for venue: $venueId")
                    venueDetector.onGeofenceExit(venueId)
                }
            }

            Geofence.GEOFENCE_TRANSITION_DWELL -> {
                // Dwell transitions can be used for more precise presence detection.
                // Currently not configured but logged for future use.
                for (geofence in triggeringGeofences) {
                    Log.d(TAG, "DWELL transition for venue: ${geofence.requestId}")
                }
            }

            else -> {
                Log.w(TAG, "Unknown geofence transition type: $transitionType")
            }
        }
    }
}
