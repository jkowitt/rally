package com.vanwagner.rally.core.model

import kotlinx.serialization.Serializable

/**
 * Response from authentication endpoints.
 */
@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Double,
    val user: UserProfile
)

/**
 * Token pair for refresh operations.
 */
@Serializable
data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Double
)

/**
 * Result from check-in submission.
 */
@Serializable
data class CheckInResponse(
    val checkIn: CheckIn,
    val pointsEarned: Int,
    val newBalance: Int,
    val streakCount: Int = 0,
    val message: String? = null
)

/**
 * Result from activation submission (prediction, trivia, etc.).
 */
@Serializable
data class SubmissionResult(
    val isCorrect: Boolean? = null,
    val pointsEarned: Int,
    val newBalance: Int,
    val message: String? = null
)

/**
 * Result from reward redemption.
 */
@Serializable
data class RedemptionResult(
    val redemption: Redemption,
    val newBalance: Int,
    val message: String? = null
)

/**
 * Generic paginated response wrapper.
 */
@Serializable
data class PaginatedResponse<T>(
    val items: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Int,
    val totalPages: Int
) {
    val hasNextPage: Boolean
        get() = page < totalPages

    val hasPreviousPage: Boolean
        get() = page > 1
}
