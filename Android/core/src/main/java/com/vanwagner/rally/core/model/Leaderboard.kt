package com.vanwagner.rally.core.model

import kotlinx.serialization.Serializable

/**
 * Represents a leaderboard entry for gameday rankings.
 */
@Serializable
data class LeaderboardEntry(
    val id: String,
    val userID: String,
    val displayName: String,
    val avatarURL: String? = null,
    val score: Int,
    val rank: Int,
    val tier: Tier = Tier.ROOKIE
)

/**
 * Represents a complete leaderboard with metadata.
 */
@Serializable
data class Leaderboard(
    val eventID: String,
    val entries: List<LeaderboardEntry>,
    val currentUserRank: Int? = null,
    val totalParticipants: Int = 0,
    val updatedAt: Long = System.currentTimeMillis()
)
