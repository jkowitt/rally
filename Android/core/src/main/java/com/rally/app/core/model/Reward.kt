package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a redeemable reward in the loyalty catalog.
 */
@Serializable
data class Reward(
    val id: String,
    val schoolID: String,
    val title: String,
    val description: String,
    val pointsCost: Int,
    val imageURL: String? = null,
    val category: RewardCategory = RewardCategory.MERCHANDISE,
    val minimumTier: Tier = Tier.ROOKIE,
    val sponsorID: String? = null,
    val inventory: Int? = null,
    val expiresAt: Long? = null,
    val isActive: Boolean = true
)

/**
 * Categories for organizing rewards in the catalog.
 */
@Serializable
enum class RewardCategory {
    @SerialName("merchandise") MERCHANDISE,
    @SerialName("concessions") CONCESSIONS,
    @SerialName("experiences") EXPERIENCES,
    @SerialName("tickets") TICKETS,
    @SerialName("digital") DIGITAL,
    @SerialName("partner") PARTNER;

    val displayName: String
        get() = name.lowercase().replaceFirstChar { it.uppercase() }
}

/**
 * Represents a reward redemption transaction.
 */
@Serializable
data class Redemption(
    val id: String,
    val rewardID: String,
    val userID: String,
    val pointsSpent: Int,
    val redeemedAt: Long = System.currentTimeMillis(),
    val status: RedemptionStatus = RedemptionStatus.PENDING,
    val redemptionCode: String? = null,
    val expiresAt: Long? = null
)

/**
 * Current status of a reward redemption.
 */
@Serializable
enum class RedemptionStatus {
    @SerialName("pending") PENDING,
    @SerialName("confirmed") CONFIRMED,
    @SerialName("used") USED,
    @SerialName("expired") EXPIRED,
    @SerialName("cancelled") CANCELLED
}
