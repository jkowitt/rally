package com.vanwagner.rally.feature.location

import android.util.Log
import com.vanwagner.rally.core.model.Venue
import dagger.hilt.android.scopes.ActivityRetainedScoped
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import javax.inject.Inject

// ── Venue Events ────────────────────────────────────────────────────────

/** Represents a venue-related event produced by combining geofence and beacon signals. */
sealed interface VenueEvent {
    /** User entered a geofenced venue region. */
    data class Enter(val venueId: String, val timestampMillis: Long = System.currentTimeMillis()) : VenueEvent

    /** User exited a geofenced venue region. */
    data class Exit(val venueId: String, val timestampMillis: Long = System.currentTimeMillis()) : VenueEvent

    /** A Rally beacon was detected inside a venue. */
    data class BeaconDetected(
        val venueId: String,
        val major: Int,
        val minor: Int,
        val distanceMeters: Double,
        val timestampMillis: Long = System.currentTimeMillis(),
    ) : VenueEvent
}

// ── Venue Presence State ────────────────────────────────────────────────

/** Snapshot of the user's current venue presence. */
data class VenuePresence(
    /** Currently occupied venue, if any. */
    val currentVenue: Venue? = null,
    /** Most recent event. */
    val lastEvent: VenueEvent? = null,
    /** Whether we are actively scanning for beacons inside the venue. */
    val isBeaconScanning: Boolean = false,
    /** Nearest beacon distance, if applicable. */
    val nearestBeaconDistance: Double? = null,
)

// ── Detector ────────────────────────────────────────────────────────────

/**
 * Combines geofence transitions from [LocationService] and BLE detections from
 * [BeaconScanner] into a unified [StateFlow] of [VenuePresence].
 *
 * Lifecycle: scoped to ActivityRetained so it survives configuration changes
 * but stops when the user leaves the app.
 */
@ActivityRetainedScoped
class VenueDetector @Inject constructor(
    private val locationService: LocationService,
    private val beaconScanner: BeaconScanner,
) {
    companion object {
        private const val TAG = "VenueDetector"

        /** Beacon must be within this range (meters) to count as "in section". */
        private const val BEACON_NEAR_THRESHOLD = 10.0
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _presence = MutableStateFlow(VenuePresence())
    val presence: StateFlow<VenuePresence> = _presence.asStateFlow()

    /** All venues currently being monitored. */
    private val monitoredVenues = mutableMapOf<String, Venue>()

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Begin monitoring a set of venues. Registers geofences and prepares
     * beacon scanning for when the user enters a geofenced region.
     */
    fun startMonitoring(venues: List<Venue>) {
        venues.forEach { monitoredVenues[it.id] = it }
        locationService.registerVenueGeofences(venues)
        Log.d(TAG, "Monitoring ${venues.size} venues")
    }

    /** Stop all monitoring and scanning. */
    fun stopMonitoring() {
        locationService.removeAllGeofences()
        monitoredVenues.clear()
        _presence.value = VenuePresence()
        Log.d(TAG, "All monitoring stopped")
    }

    // ── Geofence Handling ───────────────────────────────────────────────

    /**
     * Called by [GeofenceBroadcastReceiver] when a geofence transition fires.
     */
    fun onGeofenceEnter(venueId: String) {
        val venue = monitoredVenues[venueId]
        Log.d(TAG, "Geofence ENTER: venueId=$venueId, venue=${venue?.name}")

        val event = VenueEvent.Enter(venueId)
        _presence.update {
            it.copy(currentVenue = venue, lastEvent = event)
        }

        // Start beacon scanning to refine location inside the venue
        startBeaconScanning(venueId)
    }

    fun onGeofenceExit(venueId: String) {
        Log.d(TAG, "Geofence EXIT: venueId=$venueId")

        val event = VenueEvent.Exit(venueId)
        _presence.update {
            it.copy(
                currentVenue = null,
                lastEvent = event,
                isBeaconScanning = false,
                nearestBeaconDistance = null,
            )
        }
    }

    // ── Beacon Scanning ─────────────────────────────────────────────────

    private fun startBeaconScanning(venueId: String) {
        if (_presence.value.isBeaconScanning) return

        _presence.update { it.copy(isBeaconScanning = true) }

        beaconScanner.scan()
            .onEach { beacon ->
                val event = VenueEvent.BeaconDetected(
                    venueId = venueId,
                    major = beacon.major,
                    minor = beacon.minor,
                    distanceMeters = beacon.distance,
                )

                _presence.update { current ->
                    val nearestDistance = current.nearestBeaconDistance
                    current.copy(
                        lastEvent = event,
                        nearestBeaconDistance = if (nearestDistance == null || beacon.distance < nearestDistance) {
                            beacon.distance
                        } else {
                            nearestDistance
                        },
                    )
                }

                if (beacon.distance <= BEACON_NEAR_THRESHOLD) {
                    Log.d(TAG, "Near beacon: major=${beacon.major} minor=${beacon.minor} dist=${beacon.distance}m")
                }
            }
            .catch { e ->
                Log.e(TAG, "Beacon scan error", e)
                _presence.update { it.copy(isBeaconScanning = false) }
            }
            .launchIn(scope)
    }
}
