import Foundation
import RallyCore

/// Type-safe factory methods for every Rally API endpoint.
///
/// Each method returns a fully configured ``Request`` with the correct
/// HTTP method, path, body, and response type. All endpoints that
/// require authentication default to `requiresAuth: true`.
///
/// ## Example
///
/// ```swift
/// let schools = try await apiClient.send(Endpoints.Auth.signInWithApple(request))
/// let events  = try await apiClient.send(Endpoints.Schools.events(schoolId: "s1"))
/// ```
public enum Endpoints: Sendable {

    // MARK: - Auth

    /// Authentication-related endpoints.
    public enum Auth: Sendable {

        /// `POST /auth/apple` — Sign in with Apple.
        ///
        /// - Parameter request: The Apple identity/authorization codes.
        /// - Returns: A ``Request`` whose response is ``AuthResponse``.
        public static func signInWithApple(
            _ body: AppleAuthRequest
        ) -> Request<AuthResponse> {
            Request(
                method: .post,
                path: "/auth/apple",
                body: body,
                requiresAuth: false
            )
        }

        /// `POST /auth/refresh` — Refresh the access token.
        ///
        /// - Parameter refreshToken: The current refresh token.
        /// - Returns: A ``Request`` whose response is ``TokenPair``.
        public static func refresh(
            refreshToken: String
        ) -> Request<TokenPair> {
            Request(
                method: .post,
                path: "/auth/refresh",
                body: ["refreshToken": refreshToken],
                requiresAuth: false
            )
        }
    }

    // MARK: - Schools

    /// School-related endpoints.
    public enum Schools: Sendable {

        /// `GET /schools` — Fetch the list of all schools.
        ///
        /// - Returns: A ``Request`` whose response is `[School]`.
        public static func list() -> Request<[School]> {
            Request(
                method: .get,
                path: "/schools"
            )
        }

        /// `GET /schools/:id/events` — Fetch events for a specific school.
        ///
        /// - Parameters:
        ///   - schoolId: The school identifier.
        ///   - status: Optional filter by event status.
        ///   - sport: Optional filter by sport type.
        /// - Returns: A ``Request`` whose response is `[Event]`.
        public static func events(
            schoolId: String,
            status: EventStatus? = nil,
            sport: Sport? = nil
        ) -> Request<[Event]> {
            var query: [(String, String)] = []
            if let status { query.append(("status", status.rawValue)) }
            if let sport { query.append(("sport", sport.rawValue)) }

            return Request(
                method: .get,
                path: "/schools/\(schoolId)/events",
                query: query
            )
        }
    }

    // MARK: - Events

    /// Event-related endpoints.
    public enum Events: Sendable {

        /// `POST /events/:id/checkin` — Check in to an event.
        ///
        /// - Parameters:
        ///   - eventId: The event identifier.
        ///   - proof: The check-in proof containing location/beacon data.
        /// - Returns: A ``Request`` whose response is ``CheckInResponse``.
        public static func checkIn(
            eventId: String,
            proof: CheckInProof
        ) -> Request<CheckInResponse> {
            Request(
                method: .post,
                path: "/events/\(eventId)/checkin",
                body: proof
            )
        }

        /// `GET /events/:id/activations` — Fetch activations for an event.
        ///
        /// - Parameter eventId: The event identifier.
        /// - Returns: A ``Request`` whose response is `[Activation]`.
        public static func activations(
            eventId: String
        ) -> Request<[Activation]> {
            Request(
                method: .get,
                path: "/events/\(eventId)/activations"
            )
        }
    }

    // MARK: - Activations

    /// Activation-related endpoints.
    public enum Activations: Sendable {

        /// `POST /activations/:id/submit` — Submit an activation response.
        ///
        /// - Parameters:
        ///   - activationId: The activation identifier.
        ///   - body: The submission payload (e.g., selected option ID).
        /// - Returns: A ``Request`` whose response is ``SubmissionResult``.
        public static func submit<Body: Encodable & Sendable>(
            activationId: String,
            body: Body
        ) -> Request<SubmissionResult> {
            Request(
                method: .post,
                path: "/activations/\(activationId)/submit",
                body: body
            )
        }
    }

    // MARK: - Users

    /// User-related endpoints.
    public enum Users: Sendable {

        /// `GET /users/me` — Fetch the authenticated user's profile.
        ///
        /// - Returns: A ``Request`` whose response is ``UserProfile``.
        public static func me() -> Request<UserProfile> {
            Request(
                method: .get,
                path: "/users/me"
            )
        }

        /// `GET /users/me/rewards` — Fetch the user's earned rewards.
        ///
        /// - Returns: A ``Request`` whose response is `[Reward]`.
        public static func myRewards() -> Request<[Reward]> {
            Request(
                method: .get,
                path: "/users/me/rewards"
            )
        }
    }

    // MARK: - Rewards

    /// Reward-related endpoints.
    public enum Rewards: Sendable {

        /// `POST /rewards/:id/redeem` — Redeem a reward.
        ///
        /// - Parameter rewardId: The reward identifier.
        /// - Returns: A ``Request`` whose response is ``RedemptionResult``.
        public static func redeem(
            rewardId: String
        ) -> Request<RedemptionResult> {
            Request(
                method: .post,
                path: "/rewards/\(rewardId)/redeem"
            )
        }
    }

    // MARK: - Content

    /// Content feed endpoints.
    public enum Content: Sendable {

        /// `GET /content/feed` — Fetch the paginated content feed.
        ///
        /// - Parameters:
        ///   - page: The page number (1-based).
        ///   - pageSize: The number of items per page.
        ///   - schoolId: Optional school filter.
        /// - Returns: A ``Request`` whose response is
        ///   `PaginatedResponse<ContentItem>`.
        public static func feed(
            page: Int = 1,
            pageSize: Int = 20,
            schoolId: String? = nil
        ) -> Request<PaginatedResponse<ContentItem>> {
            var query: [(String, String)] = [
                ("page", String(page)),
                ("pageSize", String(pageSize))
            ]
            if let schoolId { query.append(("schoolId", schoolId)) }

            return Request(
                method: .get,
                path: "/content/feed",
                query: query
            )
        }
    }

    // MARK: - WebSocket

    /// WebSocket path helper.
    public enum WebSocket: Sendable {

        /// Returns the relative path for the gameday WebSocket.
        ///
        /// The full URL is constructed by the ``WebSocketClient`` from
        /// its base URL and this path component.
        ///
        /// - Parameter eventId: The event identifier.
        /// - Returns: The path string `/ws/gameday/:eventId`.
        public static func gamedayPath(eventId: String) -> String {
            "/ws/gameday/\(eventId)"
        }
    }
}
