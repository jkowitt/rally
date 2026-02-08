import ActivityKit
import SwiftUI
import WidgetKit
import RallyCore

// MARK: - Activity Attributes

/// ActivityKit attributes that define the static context of a gameday Live Activity.
///
/// These values are set when the activity is started and do not change
/// for the lifetime of the Live Activity.
public struct GamedayActivityAttributes: ActivityAttributes, Sendable {

    /// The event identifier used to correlate push updates.
    public let eventID: String

    /// Home team display name (e.g., school abbreviation).
    public let homeTeamName: String

    /// Away team display name.
    public let awayTeamName: String

    /// URL for the home team logo (rendered in compact and expanded DI).
    public let homeLogoURL: URL?

    /// URL for the away team logo.
    public let awayLogoURL: URL?

    /// Sport type for icon selection.
    public let sport: String

    /// Primary school color hex for branding.
    public let primaryColorHex: String

    public init(
        eventID: String,
        homeTeamName: String,
        awayTeamName: String,
        homeLogoURL: URL? = nil,
        awayLogoURL: URL? = nil,
        sport: String = "football",
        primaryColorHex: String = "#FF6B35"
    ) {
        self.eventID = eventID
        self.homeTeamName = homeTeamName
        self.awayTeamName = awayTeamName
        self.homeLogoURL = homeLogoURL
        self.awayLogoURL = awayLogoURL
        self.sport = sport
        self.primaryColorHex = primaryColorHex
    }

    // MARK: - Content State

    /// Dynamic state pushed via APNs or updated locally.
    /// This is the mutable portion of the Live Activity.
    public struct ContentState: Codable, Hashable, Sendable {
        /// Current home team score.
        public let homeScore: Int

        /// Current away team score.
        public let awayScore: Int

        /// Current period / quarter / half label (e.g., "Q3", "2nd Half").
        public let period: String

        /// Game clock display string (e.g., "12:34", "FINAL").
        public let gameClock: String

        /// Total fan points earned this gameday.
        public let fanPoints: Int

        /// Fan points goal for the event (for progress bar).
        public let fanPointsGoal: Int

        /// Whether the event is still live.
        public let isLive: Bool

        /// Upcoming activation title, if any.
        public let nextActivation: String?

        public init(
            homeScore: Int = 0,
            awayScore: Int = 0,
            period: String = "Pre-Game",
            gameClock: String = "",
            fanPoints: Int = 0,
            fanPointsGoal: Int = 500,
            isLive: Bool = true,
            nextActivation: String? = nil
        ) {
            self.homeScore = homeScore
            self.awayScore = awayScore
            self.period = period
            self.gameClock = gameClock
            self.fanPoints = fanPoints
            self.fanPointsGoal = fanPointsGoal
            self.isLive = isLive
            self.nextActivation = nextActivation
        }
    }
}

// MARK: - Live Activity Manager

/// Manages the lifecycle of the gameday Live Activity:
/// starting, updating via local pushes, requesting the APNs push token,
/// and implementing 60-second fallback polling.
@MainActor
public final class GamedayLiveActivityManager {

    /// The currently running Live Activity, if any.
    public private(set) var currentActivity: Activity<GamedayActivityAttributes>?

    /// The APNs push token for remote updates, hex-encoded.
    public private(set) var pushTokenHex: String?

    private var pollingTask: Task<Void, Never>?
    private var tokenObservationTask: Task<Void, Never>?

    public init() {}

    // MARK: - Start

    /// Start a new gameday Live Activity.
    ///
    /// - Parameters:
    ///   - attributes: Static attributes for the event.
    ///   - initialState: Initial content state.
    /// - Returns: The push token (hex string) if available, for registration with APNs.
    @discardableResult
    public func start(
        attributes: GamedayActivityAttributes,
        initialState: GamedayActivityAttributes.ContentState
    ) throws -> String? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            return nil
        }

        let content = ActivityContent(
            state: initialState,
            staleDate: Date.now.addingTimeInterval(120)
        )

        let activity = try Activity.request(
            attributes: attributes,
            content: content,
            pushType: .token
        )

        self.currentActivity = activity
        observePushToken(activity: activity)
        startFallbackPolling()

        return pushTokenHex
    }

    // MARK: - Update

    /// Update the Live Activity with new content state.
    public func update(state: GamedayActivityAttributes.ContentState) async {
        guard let activity = currentActivity else { return }

        let content = ActivityContent(
            state: state,
            staleDate: Date.now.addingTimeInterval(120)
        )

        await activity.update(content)
    }

    // MARK: - End

    /// End the Live Activity with a final state.
    public func end(finalState: GamedayActivityAttributes.ContentState) async {
        guard let activity = currentActivity else { return }

        let content = ActivityContent(
            state: finalState,
            staleDate: nil
        )

        await activity.end(content, dismissalPolicy: .after(.now.addingTimeInterval(3600)))

        pollingTask?.cancel()
        pollingTask = nil
        tokenObservationTask?.cancel()
        tokenObservationTask = nil
        currentActivity = nil
    }

    // MARK: - Push Token Observation

    /// Observe the push token for the activity and report it to the server.
    private func observePushToken(activity: Activity<GamedayActivityAttributes>) {
        tokenObservationTask = Task {
            for await pushToken in activity.pushTokenUpdates {
                let hex = pushToken.map { String(format: "%02x", $0) }.joined()
                self.pushTokenHex = hex
                await registerPushToken(hex, eventID: activity.attributes.eventID)
            }
        }
    }

    /// Register the push token with the Rally backend so APNs can update
    /// the Live Activity remotely.
    ///
    /// In production this calls:
    /// `POST /v1/events/{eventID}/live-activity-token  { "token": token }`
    private func registerPushToken(_ token: String, eventID: String) async {
        // Networking layer handles the actual call via APIClient.
    }

    // MARK: - Fallback Polling

    /// Poll the event API every 60 seconds as a fallback when APNs
    /// push delivery is delayed or unavailable.
    private func startFallbackPolling() {
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard !Task.isCancelled else { return }
                await self?.pollForUpdate()
            }
        }
    }

    /// Fetch latest state from the server and update the Live Activity.
    /// In production this calls EventRepositoryProtocol and converts to ContentState.
    private func pollForUpdate() async {
        // Stub: the app-level coordinator wires this to the event repository.
    }
}

// MARK: - Lock Screen Live Activity View

/// The Lock Screen / notification banner presentation of the gameday Live Activity.
/// Shows team logos, live score, period, game clock, and a fan points progress bar.
struct GamedayLockScreenView: View {
    let context: ActivityViewContext<GamedayActivityAttributes>

    var body: some View {
        VStack(spacing: 12) {
            // MARK: Score Row
            HStack {
                // Home team
                teamColumn(
                    name: context.attributes.homeTeamName,
                    logoURL: context.attributes.homeLogoURL,
                    score: context.state.homeScore,
                    isLeading: true
                )

                Spacer()

                // Center: period + clock
                VStack(spacing: 2) {
                    Text(context.state.period)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(brandColor)

                    if context.state.isLive {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(.red)
                                .frame(width: 6, height: 6)
                            Text(context.state.gameClock)
                                .font(.caption.monospacedDigit())
                                .fontWeight(.medium)
                        }
                    } else {
                        Text(context.state.gameClock)
                            .font(.caption.monospacedDigit())
                            .fontWeight(.medium)
                    }
                }

                Spacer()

                // Away team
                teamColumn(
                    name: context.attributes.awayTeamName,
                    logoURL: context.attributes.awayLogoURL,
                    score: context.state.awayScore,
                    isLeading: false
                )
            }

            // MARK: Fan Points Progress
            VStack(spacing: 4) {
                HStack {
                    Label("Fan Points", systemImage: "star.fill")
                        .font(.caption2)
                        .foregroundStyle(brandColor)
                    Spacer()
                    Text("\(context.state.fanPoints)/\(context.state.fanPointsGoal)")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(Color.white.opacity(0.15))

                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(brandColor)
                            .frame(width: max(0, geometry.size.width * fanPointsProgress))
                    }
                }
                .frame(height: 6)
            }
        }
        .padding(16)
    }

    private func teamColumn(name: String, logoURL: URL?, score: Int, isLeading: Bool) -> some View {
        HStack(spacing: 8) {
            if !isLeading {
                scoreText(score)
            }

            VStack(spacing: 2) {
                teamLogo(url: logoURL)
                Text(name)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .lineLimit(1)
            }

            if isLeading {
                scoreText(score)
            }
        }
    }

    private func scoreText(_ score: Int) -> some View {
        Text("\(score)")
            .font(.system(size: 32, weight: .black, design: .rounded))
            .monospacedDigit()
            .contentTransition(.numericText())
    }

    private var brandColor: Color {
        Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange
    }

    private var fanPointsProgress: Double {
        guard context.state.fanPointsGoal > 0 else { return 0 }
        return min(1.0, Double(context.state.fanPoints) / Double(context.state.fanPointsGoal))
    }
}

// MARK: - Live Activity Widget Configuration

/// The `Widget` definition for the gameday Live Activity.
///
/// Add this to your app's `WidgetBundle` to register the Live Activity:
/// ```swift
/// @main
/// struct RallyWidgets: WidgetBundle {
///     var body: some Widget {
///         GamedayLiveActivityWidget()
///     }
/// }
/// ```
public struct GamedayLiveActivityWidget: Widget {
    public init() {}

    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: GamedayActivityAttributes.self) { context in
            // Lock Screen / Banner presentation
            GamedayLockScreenView(context: context)
                .activityBackgroundTint(RallyColors.navy)
                .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: Expanded - Leading
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 4) {
                        teamLogo(url: context.attributes.homeLogoURL)
                            .frame(width: 20, height: 20)
                            .clipShape(Circle())
                        VStack(alignment: .leading, spacing: 1) {
                            Text(context.attributes.homeTeamName)
                                .font(.caption2)
                                .fontWeight(.semibold)
                            Text("\(context.state.homeScore)")
                                .font(.system(size: 20, weight: .black, design: .rounded))
                                .monospacedDigit()
                                .contentTransition(.numericText())
                        }
                        .foregroundStyle(.white)
                    }
                }

                // MARK: Expanded - Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    HStack(spacing: 4) {
                        VStack(alignment: .trailing, spacing: 1) {
                            Text(context.attributes.awayTeamName)
                                .font(.caption2)
                                .fontWeight(.semibold)
                            Text("\(context.state.awayScore)")
                                .font(.system(size: 20, weight: .black, design: .rounded))
                                .monospacedDigit()
                                .contentTransition(.numericText())
                        }
                        .foregroundStyle(.white)
                        teamLogo(url: context.attributes.awayLogoURL)
                            .frame(width: 20, height: 20)
                            .clipShape(Circle())
                    }
                }

                // MARK: Expanded - Center
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.state.period)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(
                                Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange
                            )

                        if context.state.isLive {
                            HStack(spacing: 3) {
                                Circle()
                                    .fill(.red)
                                    .frame(width: 5, height: 5)
                                Text(context.state.gameClock)
                                    .font(.caption.monospacedDigit())
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)
                            }
                        } else {
                            Text(context.state.gameClock)
                                .font(.caption.monospacedDigit())
                                .fontWeight(.medium)
                                .foregroundStyle(.white)
                        }
                    }
                }

                // MARK: Expanded - Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(
                                Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange
                            )

                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 2, style: .continuous)
                                    .fill(Color.white.opacity(0.15))

                                RoundedRectangle(cornerRadius: 2, style: .continuous)
                                    .fill(
                                        Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange
                                    )
                                    .frame(width: max(0, geometry.size.width * fanPointsProgress(context.state)))
                            }
                        }
                        .frame(height: 4)

                        Text("\(context.state.fanPoints) pts")
                            .font(.system(size: 10, weight: .semibold).monospacedDigit())
                            .foregroundStyle(
                                Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange
                            )
                    }
                    .padding(.horizontal, 4)
                }

            } compactLeading: {
                // MARK: Compact - Leading
                HStack(spacing: 4) {
                    teamLogo(url: context.attributes.homeLogoURL)
                        .frame(width: 18, height: 18)
                        .clipShape(Circle())

                    Text("\(context.state.homeScore)")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())
                }

            } compactTrailing: {
                // MARK: Compact - Trailing
                HStack(spacing: 4) {
                    Text("\(context.state.awayScore)")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())

                    teamLogo(url: context.attributes.awayLogoURL)
                        .frame(width: 18, height: 18)
                        .clipShape(Circle())
                }

            } minimal: {
                // MARK: Minimal
                Text("\(context.state.homeScore)-\(context.state.awayScore)")
                    .font(.caption2.bold().monospacedDigit())
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())
            }
        }
    }

    // MARK: - Helpers

    private func teamLogo(url: URL?) -> some View {
        Group {
            if let url {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fit)
                } placeholder: {
                    Image(systemName: "sportscourt.fill")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Image(systemName: "sportscourt.fill")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func fanPointsProgress(_ state: GamedayActivityAttributes.ContentState) -> Double {
        guard state.fanPointsGoal > 0 else { return 0 }
        return min(1.0, Double(state.fanPoints) / Double(state.fanPointsGoal))
    }
}

// MARK: - Preview

#Preview("Lock Screen", as: .content, using: GamedayActivityAttributes(
    eventID: "evt-1",
    homeTeamName: "RALLY",
    awayTeamName: "RIVALS",
    sport: "football",
    primaryColorHex: "#FF6B35"
)) {
    GamedayLiveActivityWidget()
} contentStates: {
    GamedayActivityAttributes.ContentState(
        homeScore: 21,
        awayScore: 14,
        period: "Q3",
        gameClock: "8:42",
        fanPoints: 275,
        fanPointsGoal: 500,
        isLive: true
    )
    GamedayActivityAttributes.ContentState(
        homeScore: 28,
        awayScore: 21,
        period: "FINAL",
        gameClock: "0:00",
        fanPoints: 480,
        fanPointsGoal: 500,
        isLive: false
    )
}
