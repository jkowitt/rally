import WidgetKit
import SwiftUI
import RallyCore

/// Timeline entry for the points balance widget.
struct PointsEntry: TimelineEntry {
    let date: Date
    let pointsBalance: Int
    let tier: Tier
    let progressToNextTier: Double
    let schoolName: String
    let primaryColor: Color

    static let placeholder = PointsEntry(
        date: .now,
        pointsBalance: 1_250,
        tier: .starter,
        progressToNextTier: 0.625,
        schoolName: "State University",
        primaryColor: RallyColors.orange
    )
}

/// Provider for the points balance widget timeline.
struct PointsProvider: TimelineProvider {
    func placeholder(in context: Context) -> PointsEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (PointsEntry) -> Void) {
        completion(.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PointsEntry>) -> Void) {
        let entry = PointsEntry.placeholder
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

/// Points balance widget view.
struct PointsWidgetView: View {
    let entry: PointsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            HStack {
                Text("Rally Points")
                    .font(RallyTypography.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(entry.tier.rawValue)
                    .font(RallyTypography.caption)
                    .foregroundStyle(entry.primaryColor)
                    .padding(.horizontal, RallySpacing.sm)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(entry.primaryColor.opacity(0.2))
                    )
            }

            Text("\(entry.pointsBalance)")
                .font(RallyTypography.heroTitle)
                .foregroundStyle(.white)
                .monospacedDigit()

            Text("pts")
                .font(RallyTypography.caption)
                .foregroundStyle(.secondary)
                .offset(y: -4)

            Spacer()

            if let nextTier = entry.tier.nextTier {
                VStack(alignment: .leading, spacing: 4) {
                    ProgressView(value: entry.progressToNextTier)
                        .tint(entry.primaryColor)
                    Text("\(nextTier.minimumPoints - entry.pointsBalance) pts to \(nextTier.rawValue)")
                        .font(RallyTypography.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(RallySpacing.md)
        .containerBackground(for: .widget) {
            RallyColors.navy
        }
    }
}

/// The points balance widget configuration.
struct PointsWidget: Widget {
    let kind = "PointsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PointsProvider()) { entry in
            PointsWidgetView(entry: entry)
        }
        .configurationDisplayName("Points Balance")
        .description("View your Rally points and tier progress.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
