import ActivityKit
import SwiftUI
import WidgetKit
import RallyCore

/// Attributes for the Gameday Live Activity on Lock Screen and Dynamic Island.
public struct GamedayActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var homeScore: Int
        public var awayScore: Int
        public var period: String
        public var clock: String
        public var pointsEarned: Int
        public var nextActivation: String?

        public init(
            homeScore: Int, awayScore: Int,
            period: String, clock: String,
            pointsEarned: Int, nextActivation: String? = nil
        ) {
            self.homeScore = homeScore
            self.awayScore = awayScore
            self.period = period
            self.clock = clock
            self.pointsEarned = pointsEarned
            self.nextActivation = nextActivation
        }
    }

    public let eventID: String
    public let homeTeam: String
    public let awayTeam: String
    public let sport: String
    public let primaryColorHex: String

    public init(eventID: String, homeTeam: String, awayTeam: String, sport: String, primaryColorHex: String) {
        self.eventID = eventID
        self.homeTeam = homeTeam
        self.awayTeam = awayTeam
        self.sport = sport
        self.primaryColorHex = primaryColorHex
    }
}

/// Live Activity widget for the gameday experience.
public struct GamedayLiveActivityWidget: Widget {
    public init() {}

    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: GamedayActivityAttributes.self) { context in
            // Lock Screen
            HStack(spacing: RallySpacing.md) {
                VStack {
                    Text(context.attributes.homeTeam)
                        .font(RallyTypography.caption)
                        .foregroundStyle(.secondary)
                    Text("\(context.state.homeScore)")
                        .font(RallyTypography.heroTitle)
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text(context.state.period)
                        .font(RallyTypography.caption)
                        .foregroundStyle(Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange)
                    Text(context.state.clock)
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(.white)
                        .monospacedDigit()
                    Label("+\(context.state.pointsEarned) pts", systemImage: "star.fill")
                        .font(RallyTypography.caption)
                        .foregroundStyle(Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange)
                        .padding(.top, 4)
                }

                VStack {
                    Text(context.attributes.awayTeam)
                        .font(RallyTypography.caption)
                        .foregroundStyle(.secondary)
                    Text("\(context.state.awayScore)")
                        .font(RallyTypography.heroTitle)
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(RallySpacing.md)
            .activityBackgroundTint(RallyColors.navy)
            .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading) {
                        Text(context.attributes.homeTeam)
                            .font(RallyTypography.caption)
                        Text("\(context.state.homeScore)")
                            .font(RallyTypography.sectionHeader)
                    }
                    .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing) {
                        Text(context.attributes.awayTeam)
                            .font(RallyTypography.caption)
                        Text("\(context.state.awayScore)")
                            .font(RallyTypography.sectionHeader)
                    }
                    .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text(context.state.period)
                            .font(RallyTypography.caption)
                            .foregroundStyle(Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange)
                        Text(context.state.clock)
                            .font(RallyTypography.cardTitle)
                            .foregroundStyle(.white)
                            .monospacedDigit()
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Label("+\(context.state.pointsEarned) pts", systemImage: "star.fill")
                            .font(RallyTypography.caption)
                            .foregroundStyle(Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange)
                        Spacer()
                        if let next = context.state.nextActivation {
                            Text("Next: \(next)")
                                .font(RallyTypography.caption)
                                .foregroundStyle(RallyColors.gray)
                        }
                    }
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Text("\(context.state.homeScore)")
                        .font(RallyTypography.buttonLabel)
                    Text("-").foregroundStyle(RallyColors.gray)
                    Text("\(context.state.awayScore)")
                        .font(RallyTypography.buttonLabel)
                }
                .foregroundStyle(.white)
            } compactTrailing: {
                Text(context.state.period)
                    .font(RallyTypography.caption)
                    .foregroundStyle(Color(hex: context.attributes.primaryColorHex) ?? RallyColors.orange)
            } minimal: {
                Text("\(context.state.homeScore)-\(context.state.awayScore)")
                    .font(RallyTypography.caption)
                    .foregroundStyle(.white)
            }
        }
    }
}
