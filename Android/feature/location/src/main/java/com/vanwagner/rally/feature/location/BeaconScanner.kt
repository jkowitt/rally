package com.vanwagner.rally.feature.location

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.app.ActivityCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

// ── Beacon Data ─────────────────────────────────────────────────────────

/**
 * Parsed iBeacon advertisement.
 *
 * @property uuid       Proximity UUID identifying the beacon network (e.g., all Rally beacons).
 * @property major      Major value, typically identifies a venue.
 * @property minor      Minor value, typically identifies a section / zone.
 * @property rssi       Received signal strength in dBm.
 * @property txPower    Calibrated TX power at 1 meter.
 * @property distance   Estimated distance in meters (approximate).
 */
data class IBeacon(
    val uuid: UUID,
    val major: Int,
    val minor: Int,
    val rssi: Int,
    val txPower: Int,
    val distance: Double,
)

// ── Scanner ─────────────────────────────────────────────────────────────

/**
 * BLE beacon scanner that detects iBeacon-format advertisements.
 *
 * Usage:
 * ```
 * beaconScanner.scan().collect { beacon ->
 *     Log.d("Beacon", "Detected: $beacon")
 * }
 * ```
 */
@Singleton
class BeaconScanner @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "BeaconScanner"

        // iBeacon manufacturer-specific data layout
        private const val IBEACON_COMPANY_ID = 0x004C // Apple
        private const val IBEACON_TYPE: Byte = 0x02
        private const val IBEACON_DATA_LENGTH: Byte = 0x15 // 21 bytes

        // Rally beacon proximity UUID -- all Rally-deployed beacons share this UUID
        val RALLY_BEACON_UUID: UUID = UUID.fromString("F7826DA6-4FA2-4E98-8024-BC5B71E0893E")
    }

    private val bluetoothManager: BluetoothManager? =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager

    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter

    /** `true` if the device supports BLE and Bluetooth is enabled. */
    val isAvailable: Boolean
        get() = bluetoothAdapter?.isEnabled == true &&
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)

    // ── Scanning ────────────────────────────────────────────────────────

    /**
     * Starts a BLE scan and emits [IBeacon] detections as a cold [Flow].
     * The scan stops automatically when the flow collector cancels.
     *
     * @param filterUuid optional UUID filter; defaults to [RALLY_BEACON_UUID].
     */
    fun scan(filterUuid: UUID? = RALLY_BEACON_UUID): Flow<IBeacon> = callbackFlow {
        if (!isAvailable) {
            Log.w(TAG, "BLE not available or Bluetooth disabled; closing scan flow")
            close()
            return@callbackFlow
        }

        if (!hasBlePermission()) {
            Log.w(TAG, "Missing BLE scan permission; closing scan flow")
            close()
            return@callbackFlow
        }

        val scanner: BluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner ?: run {
            Log.w(TAG, "BluetoothLeScanner is null; closing scan flow")
            close()
            return@callbackFlow
        }

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0) // immediate callbacks
            .build()

        // We use a broad filter (Apple manufacturer data) and parse iBeacon in the callback
        val filters = listOf(
            ScanFilter.Builder()
                .setManufacturerData(IBEACON_COMPANY_ID, byteArrayOf(IBEACON_TYPE, IBEACON_DATA_LENGTH))
                .build(),
        )

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                parseIBeacon(result)?.let { beacon ->
                    if (filterUuid == null || beacon.uuid == filterUuid) {
                        trySend(beacon)
                    }
                }
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                results.forEach { result ->
                    parseIBeacon(result)?.let { beacon ->
                        if (filterUuid == null || beacon.uuid == filterUuid) {
                            trySend(beacon)
                        }
                    }
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "BLE scan failed with error code: $errorCode")
                close(IllegalStateException("BLE scan failed: $errorCode"))
            }
        }

        try {
            scanner.startScan(filters, scanSettings, callback)
            Log.d(TAG, "BLE scan started")
        } catch (se: SecurityException) {
            Log.e(TAG, "SecurityException starting BLE scan", se)
            close(se)
            return@callbackFlow
        }

        awaitClose {
            try {
                scanner.stopScan(callback)
                Log.d(TAG, "BLE scan stopped")
            } catch (se: SecurityException) {
                Log.e(TAG, "SecurityException stopping BLE scan", se)
            }
        }
    }

    // ── iBeacon Parsing ─────────────────────────────────────────────────

    /**
     * Attempts to parse an iBeacon from the Apple manufacturer-specific data.
     *
     * iBeacon layout (after company id 0x004C):
     * - Byte 0:    type = 0x02
     * - Byte 1:    length = 0x15
     * - Bytes 2-17:  UUID (16 bytes)
     * - Bytes 18-19: Major (big-endian uint16)
     * - Bytes 20-21: Minor (big-endian uint16)
     * - Byte 22:     TX Power (signed int8, calibrated at 1m)
     */
    private fun parseIBeacon(result: ScanResult): IBeacon? {
        val data = result.scanRecord?.getManufacturerSpecificData(IBEACON_COMPANY_ID) ?: return null
        if (data.size < 23) return null
        if (data[0] != IBEACON_TYPE || data[1] != IBEACON_DATA_LENGTH) return null

        val uuidBytes = ByteBuffer.wrap(data, 2, 16).order(ByteOrder.BIG_ENDIAN)
        val msb = uuidBytes.long
        val lsb = uuidBytes.long
        val uuid = UUID(msb, lsb)

        val major = ((data[18].toInt() and 0xFF) shl 8) or (data[19].toInt() and 0xFF)
        val minor = ((data[20].toInt() and 0xFF) shl 8) or (data[21].toInt() and 0xFF)
        val txPower = data[22].toInt() // signed

        val rssi = result.rssi
        val distance = estimateDistance(txPower, rssi)

        return IBeacon(
            uuid = uuid,
            major = major,
            minor = minor,
            rssi = rssi,
            txPower = txPower,
            distance = distance,
        )
    }

    /**
     * Simple path-loss distance estimate using the log-distance model.
     */
    private fun estimateDistance(txPower: Int, rssi: Int): Double {
        if (rssi == 0) return -1.0
        val ratio = rssi.toDouble() / txPower
        return if (ratio < 1.0) {
            Math.pow(ratio, 10.0)
        } else {
            0.89976 * Math.pow(ratio, 7.7095) + 0.111
        }
    }

    // ── Permission Helpers ──────────────────────────────────────────────

    private fun hasBlePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_SCAN,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
        }
    }
}
