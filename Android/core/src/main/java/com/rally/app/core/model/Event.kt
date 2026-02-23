package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a sporting event that fans can attend and earn points at.
 */
@Serializable
data class Event(
    val id: String,
    val schoolID: String,
    val sport: Sport,
    val title: String,
    val opponent: String,
    val venueID: String,
    val startTime: Long,
    val endTime: Long? = null,
    val status: EventStatus = EventStatus.UPCOMING,
    val imageURL: String? = null,
    val activations: List<Activation> = emptyList(),
    val homeScore: Int? = null,
    val awayScore: Int? = null,
    val venue: String = "",
    val homeTeam: String = "",
    val awayTeam: String = "",
    val period: String = "",
    val formattedDate: String = ""
)

/**
 * Current status of an event.
 */
@Serializable
enum class EventStatus {
    @SerialName("upcoming") UPCOMING,
    @SerialName("live") LIVE,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

/**
 * Represents a gameday activation (e.g., prediction, trivia, noise meter).
 */
@Serializable
data class Activation(
    val id: String,
    val eventID: String,
    val type: ActivationType,
    val title: String,
    val description: String = "",
    val pointsValue: Int,
    val startsAt: Long? = null,
    val endsAt: Long? = null,
    val status: ActivationStatus = ActivationStatus.UPCOMING,
    val sponsorID: String? = null,
    val payload: ActivationPayload? = null
)

/**
 * Types of gameday activations available to fans.
 */
@Serializable
enum class ActivationType {
    @SerialName("prediction") PREDICTION,
    @SerialName("trivia") TRIVIA,
    @SerialName("noise_meter") NOISE_METER,
    @SerialName("poll") POLL,
    @SerialName("photo_challenge") PHOTO_CHALLENGE,
    @SerialName("check_in") CHECK_IN,
    @SerialName("survey") SURVEY;

    val displayName: String
        get() = when (this) {
            PREDICTION -> "Prediction"
            TRIVIA -> "Trivia"
            NOISE_METER -> "Noise Meter"
            POLL -> "Poll"
            PHOTO_CHALLENGE -> "Photo Challenge"
            CHECK_IN -> "Check-In"
            SURVEY -> "Survey"
        }
}

/**
 * Current status of an activation.
 */
@Serializable
enum class ActivationStatus {
    @SerialName("upcoming") UPCOMING,
    @SerialName("active") ACTIVE,
    @SerialName("locked") LOCKED,
    @SerialName("completed") COMPLETED
}

/**
 * Flexible payload for activation-specific data (questions, options, etc.).
 */
@Serializable
data class ActivationPayload(
    val question: String? = null,
    val options: List<ActivationOption>? = null,
    val correctOptionID: String? = null,
    val imageURL: String? = null,
    val timeLimit: Double? = null
)

/**
 * A selectable option within an activation (e.g., trivia answer, poll choice).
 */
@Serializable
data class ActivationOption(
    val id: String,
    val text: String,
    val imageURL: String? = null
)

/**
 * A selectable option within a prediction activation (e.g., "Who will score next?").
 */
@Serializable
data class PredictionOption(
    val id: String,
    val text: String,
)
