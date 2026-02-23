package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Sealed interface representing content items in the year-round engagement feed.
 */
@Serializable
sealed interface ContentItem {
    val id: String
    val title: String

    @Serializable
    @SerialName("article")
    data class ArticleItem(
        override val id: String,
        override val title: String,
        val summary: String = "",
        val imageUrl: String? = null,
        val authorName: String = "",
        val publishedAt: Long = System.currentTimeMillis(),
    ) : ContentItem

    @Serializable
    @SerialName("poll")
    data class PollItem(
        override val id: String,
        override val title: String,
        val poll: Poll,
    ) : ContentItem

    @Serializable
    @SerialName("countdown")
    data class CountdownItem(
        override val id: String,
        override val title: String,
        val targetEpochMillis: Long,
    ) : ContentItem
}

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

/**
 * Represents a poll with options and vote tracking.
 */
@Serializable
data class Poll(
    val question: String,
    val options: List<String> = emptyList(),
    val voteCounts: List<Int> = emptyList(),
    val selectedOptionIndex: Int? = null,
    val hasVoted: Boolean = false
)

/**
 * Detailed article content for the detail screen.
 */
@Serializable
data class ArticleDetail(
    val id: String,
    val title: String,
    val category: String = "",
    val authorName: String = "",
    val publishedAt: Long = System.currentTimeMillis(),
    val heroImageUrl: String? = null,
    val bodyParagraphs: List<String> = emptyList(),
    val tags: List<String> = emptyList()
)
