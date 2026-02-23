package com.rally.app.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a partner school in the Rally platform.
 */
@Serializable
data class School(
    val id: String,
    val name: String,
    val mascot: String,
    val abbreviation: String,
    val logoURL: String? = null,
    val mascotImageURL: String? = null,
    val bannerImageURL: String? = null,
    val theme: SchoolTheme,
    val venues: List<Venue> = emptyList(),
    val isActive: Boolean = true
)

/**
 * Theme configuration for a school's branded experience.
 */
@Serializable
data class SchoolTheme(
    val primaryColor: String,
    val secondaryColor: String,
    val accentColor: String,
    val darkModeBackground: String? = null,
    val fontOverride: String? = null
)

/**
 * Represents a physical venue where events take place.
 */
@Serializable
data class Venue(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Double = 500.0,
    val beaconUUID: String? = null,
    val beaconMajor: Int? = null,
    val sport: Sport = Sport.FOOTBALL
)

/**
 * Supported sport types in the Rally platform.
 */
@Serializable
enum class Sport {
    @SerialName("football") FOOTBALL,
    @SerialName("basketball") BASKETBALL,
    @SerialName("baseball") BASEBALL,
    @SerialName("softball") SOFTBALL,
    @SerialName("soccer") SOCCER,
    @SerialName("volleyball") VOLLEYBALL,
    @SerialName("hockey") HOCKEY,
    @SerialName("lacrosse") LACROSSE,
    @SerialName("other") OTHER;

    val displayName: String
        get() = name.lowercase().replaceFirstChar { it.uppercase() }
}
