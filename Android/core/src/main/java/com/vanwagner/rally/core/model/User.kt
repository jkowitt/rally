package com.vanwagner.rally.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Lightweight user identity used during authentication and onboarding.
 */
@Serializable
data class User(
    val id: String,
    val email: String? = null,
    val displayName: String? = null,
    val schoolId: String? = null
)

/**
 * Represents the authenticated user's profile.
 */
@Serializable
data class UserProfile(
    val id: String,
    val email: String? = null,
    val displayName: String,
    val avatarURL: String? = null,
    val schoolID: String? = null,
    val tier: Tier = Tier.ROOKIE,
    val pointsBalance: Int = 0,
    val lifetimePoints: Int = 0,
    val checkInCount: Int = 0,
    val joinedAt: Long = System.currentTimeMillis(),
    val preferences: UserPreferences = UserPreferences()
)

/**
 * User notification and content preferences.
 */
@Serializable
data class UserPreferences(
    val pushNotificationsEnabled: Boolean = true,
    val gamedayAlertsEnabled: Boolean = true,
    val sponsorOffersEnabled: Boolean = true,
    val favoriteSports: List<Sport> = emptyList()
)

/**
 * Loyalty tiers with ascending order of engagement.
 *
 * Point thresholds: Rookie(0), Starter(500), All-Star(2000), MVP(5000), Hall of Fame(15000)
 */
@Serializable
enum class Tier(val displayName: String, val minimumPoints: Int, val sortOrder: Int) {
    @SerialName("Rookie")
    ROOKIE("Rookie", 0, 0),

    @SerialName("Starter")
    STARTER("Starter", 500, 1),

    @SerialName("All-Star")
    ALL_STAR("All-Star", 2_000, 2),

    @SerialName("MVP")
    MVP("MVP", 5_000, 3),

    @SerialName("Hall of Fame")
    HALL_OF_FAME("Hall of Fame", 15_000, 4);

    /**
     * Returns the next tier in the progression, or null if already at the highest tier.
     */
    val nextTier: Tier?
        get() = when (this) {
            ROOKIE -> STARTER
            STARTER -> ALL_STAR
            ALL_STAR -> MVP
            MVP -> HALL_OF_FAME
            HALL_OF_FAME -> null
        }

    /**
     * Points required to reach the next tier, or null if already at the highest tier.
     */
    val pointsToNextTier: Int?
        get() = nextTier?.minimumPoints?.minus(minimumPoints)

    companion object {
        /**
         * Returns the appropriate tier for a given lifetime points total.
         */
        fun forPoints(points: Int): Tier =
            entries.sortedByDescending { it.minimumPoints }
                .first { points >= it.minimumPoints }
    }
}
