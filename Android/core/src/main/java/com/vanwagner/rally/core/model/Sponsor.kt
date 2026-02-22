package com.vanwagner.rally.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a sponsor with branded activations and content.
 */
@Serializable
data class Sponsor(
    val id: String,
    val name: String,
    val logoURL: String? = null,
    val websiteURL: String? = null,
    val tier: SponsorTier = SponsorTier.STANDARD,
    val isActive: Boolean = true
)

/**
 * Sponsorship level/tier.
 */
@Serializable
enum class SponsorTier {
    @SerialName("presenting") PRESENTING,
    @SerialName("premium") PREMIUM,
    @SerialName("standard") STANDARD;

    val displayName: String
        get() = name.lowercase().replaceFirstChar { it.uppercase() }
}

/**
 * Tracks a sponsor impression for analytics.
 */
@Serializable
data class SponsorImpression(
    val sponsorID: String,
    val placement: String,
    val activationID: String? = null,
    val eventID: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val durationSeconds: Double? = null
)
