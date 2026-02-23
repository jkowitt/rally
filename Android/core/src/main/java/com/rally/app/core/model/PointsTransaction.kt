package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Response from the points history endpoint.
 */
@Serializable
data class PointsHistory(
    val transactions: List<PointsTransaction>,
    val totalPoints: Int
)

/**
 * Represents a single points transaction in the loyalty ledger.
 */
@Serializable
data class PointsTransaction(
    val id: String,
    val userID: String,
    val amount: Int,
    val type: TransactionType,
    val source: TransactionSource,
    val description: String,
    val eventID: String? = null,
    val activationID: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val isReconciled: Boolean = false
)

/**
 * Direction/category of a points transaction.
 */
@Serializable
enum class TransactionType {
    @SerialName("earned") EARNED,
    @SerialName("spent") SPENT,
    @SerialName("bonus") BONUS,
    @SerialName("adjustment") ADJUSTMENT,
    @SerialName("expired") EXPIRED
}

/**
 * Source activity that triggered a points transaction.
 */
@Serializable
enum class TransactionSource {
    @SerialName("check_in") CHECK_IN,
    @SerialName("prediction") PREDICTION,
    @SerialName("trivia") TRIVIA,
    @SerialName("noise_meter") NOISE_METER,
    @SerialName("poll") POLL,
    @SerialName("photo_challenge") PHOTO_CHALLENGE,
    @SerialName("reward") REWARD,
    @SerialName("referral") REFERRAL,
    @SerialName("streak") STREAK,
    @SerialName("admin") ADMIN,
    @SerialName("content") CONTENT;

    val displayName: String
        get() = when (this) {
            CHECK_IN -> "Check-In"
            PREDICTION -> "Prediction"
            TRIVIA -> "Trivia"
            NOISE_METER -> "Noise Meter"
            POLL -> "Poll"
            PHOTO_CHALLENGE -> "Photo Challenge"
            REWARD -> "Reward"
            REFERRAL -> "Referral"
            STREAK -> "Streak"
            ADMIN -> "Admin"
            CONTENT -> "Content"
        }
}
