package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a venue check-in with proof of attendance.
 */
@Serializable
data class CheckIn(
    val id: String,
    val userID: String,
    val eventID: String,
    val venueID: String,
    val timestamp: Long = System.currentTimeMillis(),
    val proof: CheckInProof,
    val pointsEarned: Int = 0,
    val status: CheckInStatus = CheckInStatus.PENDING
)

/**
 * Location and beacon evidence used to verify a check-in.
 */
@Serializable
data class CheckInProof(
    val latitude: Double,
    val longitude: Double,
    val horizontalAccuracy: Double,
    val beaconUUID: String? = null,
    val beaconMajor: Int? = null,
    val beaconMinor: Int? = null,
    val beaconProximity: String? = null,
    val attestationToken: String? = null
)

/**
 * Verification status of a check-in.
 */
@Serializable
enum class CheckInStatus {
    @SerialName("pending") PENDING,
    @SerialName("verified") VERIFIED,
    @SerialName("rejected") REJECTED,
    @SerialName("expired") EXPIRED
}
