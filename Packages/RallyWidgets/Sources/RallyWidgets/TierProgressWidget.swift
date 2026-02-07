import WidgetKit
import SwiftUI
import RallyCore

/// Timeline entry for the tier progress widget.
struct TierProgressEntry: TimelineEntry {
    let date: Date
    let currentTier: Tier
    let lifetimePoints: Int
    let nextTier: Tier?
    let progressPercent: Double
    let primaryColor: Color

    static let placeholder = TierProgressEntry(
        date: .now,
        currentTier: .allStar,
        lifetimePoints: 3_500,
        nextTier: .mvp,
        progressPercent: 0.5,
        primaryColor: RallyColors.orange
    )
}

/// Provider for the tier progress widget timeline.
struct TierProgressProvider: TimelineProvider {
    func placeholder(in context: Context) -> TierProgressEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (TierProgressEntry) -> Void) {
        completion(.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TierProgressEntry>) -> Void) {
        let entry = TierProgressEntry.placeholder
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 2, to: .now) ?? .now
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

/// Tier progress widget view with circular progress indicator.
struct TierProgressWidgetView: View {
    let entry: TierProgressEntry

    var body: some View {
        VStack(spacing: RallySpacing.sm) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 6)

                Circle()
                    .trim(from: 0, to: entry.progressPercent)
                    .stroke(
                        entry.primaryColor,
                        style: StrokeStyle(lineWidth: 6, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text(entry.currentTier.rawValue)
                        .font(RallyTypography.caption)
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.7)
                    Image(systemName: tierIcon)
                        .font(.title3)
                        .foregroundStyle(entry.primaryColor)
                }
            }
            .frame(width: 80, height: 80)

            if let nextTier = entry.nextTier {
                Text("Next: \(nextTier.rawValue)")
                    .font(RallyTypography.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("Max Tier!")
                    .font(RallyTypography.caption)
                    .foregroundStyle(entry.primaryColor)
            }
        }
        .padding(RallySpacing.md)
        .containerBackground(for: .widget) {
            RallyColors.navy
        }
    }

    private var tierIcon: String {
        switch entry.currentTier {
        case .rookie: return "star"
        case .starter: return "star.leadinghalf.filled"
        case .allStar: return "star.fill"
        case .mvp: return "trophy"
        case .hallOfFame: return "crown.fill"
        }
    }
}

/// The tier progress widget configuration.
struct TierProgressWidget: Widget {
    let kind = "TierProgressWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TierProgressProvider()) { entry in
            TierProgressWidgetView(entry: entry)
        }
        .configurationDisplayName("Tier Progress")
        .description("Track your progress toward the next loyalty tier.")
        .supportedFamilies([.systemSmall])
    }
}
