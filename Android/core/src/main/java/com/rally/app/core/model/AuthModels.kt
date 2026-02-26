package com.rally.app.core.model

import kotlinx.serialization.Serializable

/**
 * Request body for Google Sign-In authentication.
 */
@Serializable
data class GoogleAuthRequest(
    val idToken: String
)

/**
 * Request body for email/password login.
 */
@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

/**
 * Response from email/password login (matches server POST /auth/login).
 */
@Serializable
data class LoginResponse(
    val token: String,
    val user: LoginUser,
)

/**
 * User object returned by the server's /auth/login and /auth/register endpoints.
 */
@Serializable
data class LoginUser(
    val id: String,
    val email: String,
    val name: String,
    val handle: String,
    val role: String = "user",
    val schoolId: String? = null,
    val favoriteSchool: String? = null,
    val points: Int = 0,
    val tier: String = "Bronze",
    val emailVerified: Boolean = false,
)

/**
 * Request body for submitting a poll vote.
 */
@Serializable
data class PollVoteRequest(
    val optionIndex: Int,
)

/**
 * Request body for token refresh.
 */
@Serializable
data class RefreshTokenRequest(
    val refreshToken: String
)

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
