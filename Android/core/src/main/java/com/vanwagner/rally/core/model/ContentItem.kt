package com.vanwagner.rally.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a content item in the year-round engagement feed.
 */
@Serializable
data class ContentItem(
    val id: String,
    val schoolID: String,
    val type: ContentType,
    val title: String,
    val body: String? = null,
    val imageURL: String? = null,
    val externalURL: String? = null,
    val author: String? = null,
    val publishedAt: Long = System.currentTimeMillis(),
    val tags: List<String> = emptyList(),
    val sponsorID: String? = null,
    val engagementData: ContentEngagement? = null
)

/**
 * Types of content that can appear in the feed.
 */
@Serializable
enum class ContentType {
    @SerialName("article") ARTICLE,
    @SerialName("poll") POLL,
    @SerialName("countdown") COUNTDOWN,
    @SerialName("challenge") CHALLENGE,
    @SerialName("highlight") HIGHLIGHT,
    @SerialName("announcement") ANNOUNCEMENT;

    val displayName: String
        get() = name.lowercase().replaceFirstChar { it.uppercase() }
}

/**
 * Engagement metrics for a content item.
 */
@Serializable
data class ContentEngagement(
    val likes: Int = 0,
    val comments: Int = 0,
    val shares: Int = 0,
    val pointsValue: Int? = null
)
