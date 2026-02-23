package com.vanwagner.rally.networking.api

import com.vanwagner.rally.core.model.Activation
import com.vanwagner.rally.core.model.AuthResponse
import com.vanwagner.rally.core.model.CheckInResponse
import com.vanwagner.rally.core.model.Event
import com.vanwagner.rally.core.model.GoogleAuthRequest
import com.vanwagner.rally.core.model.PointsHistory
import com.vanwagner.rally.core.model.PointsTransaction
import com.vanwagner.rally.core.model.RedemptionResult
import com.vanwagner.rally.core.model.RefreshTokenRequest
import com.vanwagner.rally.core.model.Reward
import com.vanwagner.rally.core.model.School
import com.vanwagner.rally.core.model.Sponsor
import com.vanwagner.rally.core.model.SponsorImpression
import com.vanwagner.rally.core.model.SubmissionResult
import com.vanwagner.rally.core.model.TokenPair
import com.vanwagner.rally.core.model.UserProfile
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit service interface defining all Rally API endpoints.
 *
 * All suspend functions return [Response] wrappers so callers can inspect
 * HTTP status codes and headers without throwing on non-2xx responses.
 */
interface RallyApi {

    // ── Authentication ──────────────────────────────────────────────────

    @POST("auth/google")
    suspend fun authenticateWithGoogle(
        @Body request: GoogleAuthRequest,
    ): Response<AuthResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest,
    ): Response<TokenPair>

    // ── Schools & Events ────────────────────────────────────────────────

    @GET("schools")
    suspend fun getSchools(): Response<List<School>>

    @GET("schools/{id}/events")
    suspend fun getSchoolEvents(
        @Path("id") schoolId: String,
    ): Response<List<Event>>

    // ── Check-In ────────────────────────────────────────────────────────

    @POST("events/{id}/checkin")
    suspend fun checkIn(
        @Path("id") eventId: String,
    ): Response<CheckInResponse>

    // ── Activations ─────────────────────────────────────────────────────

    @GET("events/{id}/activations")
    suspend fun getActivations(
        @Path("id") eventId: String,
    ): Response<List<Activation>>

    @POST("activations/{id}/submit")
    suspend fun submitActivation(
        @Path("id") activationId: String,
    ): Response<SubmissionResult>

    // ── User ────────────────────────────────────────────────────────────

    @GET("users/me")
    suspend fun getCurrentUser(): Response<UserProfile>

    // ── Rewards ─────────────────────────────────────────────────────────

    @GET("users/me/rewards")
    suspend fun getRewards(): Response<List<Reward>>

    @POST("rewards/{id}/redeem")
    suspend fun redeemReward(
        @Path("id") rewardId: String,
    ): Response<RedemptionResult>

    // ── Sponsors ──────────────────────────────────────────────────────

    @GET("sponsors")
    suspend fun getSponsors(): Response<List<Sponsor>>

    @POST("impressions/batch")
    suspend fun sendImpressions(
        @Body impressions: List<SponsorImpression>,
    ): Response<Unit>

    // ── Points ────────────────────────────────────────────────────────

    @POST("points/award")
    suspend fun awardPoints(
        @Query("amount") amount: Int,
        @Query("source") source: String,
        @Query("description") description: String,
    ): PointsTransaction

    @GET("points/history")
    suspend fun getPointsHistory(): PointsHistory
}
