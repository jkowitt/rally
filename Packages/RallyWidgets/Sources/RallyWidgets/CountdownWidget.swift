import WidgetKit
import SwiftUI
import RallyCore

/// Timeline entry for the next game countdown widget.
struct CountdownEntry: TimelineEntry {
    let date: Date
    let eventTitle: String
    let opponent: String
    let gameTime: Date
    let sport: Sport
    let schoolName: String
    let primaryColor: Color
    let secondaryColor: Color

    static let placeholder = CountdownEntry(
        date: .now,
        eventTitle: "vs. Rival University",
        opponent: "Rival University",
        gameTime: .now.addingTimeInterval(86400 * 3),
        sport: .football,
        schoolName: "State University",
        primaryColor: RallyColors.orange,
        secondaryColor: RallyColors.navy
    )
}

/// Provider for the countdown widget timeline.
struct CountdownProvider: TimelineProvider {
    func placeholder(in context: Context) -> CountdownEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (CountdownEntry) -> Void) {
        completion(.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CountdownEntry>) -> Void) {
        let entry = CountdownEntry.placeholder
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

/// Next game countdown widget view.
struct CountdownWidgetView: View {
    let entry: CountdownEntry

    var body: some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            HStack {
                Image(systemName: sportIcon)
                    .font(.caption)
                    .foregroundStyle(entry.primaryColor)
                Text(entry.schoolName)
                    .font(RallyTypography.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }

            Text(entry.eventTitle)
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.primary)
                .lineLimit(2)

            Spacer()

            if let countdown = entry.gameTime.countdownComponents {
                HStack(spacing: RallySpacing.sm) {
                    CountdownUnit(value: countdown.days, label: "D")
                    CountdownUnit(value: countdown.hours, label: "H")
                    CountdownUnit(value: countdown.minutes, label: "M")
                }
            } else {
                Text("Game Time!")
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(entry.primaryColor)
            }
        }
        .padding(RallySpacing.md)
        .containerBackground(for: .widget) {
            entry.secondaryColor
        }
    }

    private var sportIcon: String {
        switch entry.sport {
        case .football: return "football.fill"
        case .basketball: return "basketball.fill"
        case .baseball: return "baseball.fill"
        case .soccer: return "soccerball"
        case .hockey: return "hockey.puck.fill"
        default: return "sportscourt.fill"
        }
    }
}

struct CountdownUnit: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(.white)
                .monospacedDigit()
            Text(label)
                .font(RallyTypography.caption)
                .foregroundStyle(.secondary)
        }
        .frame(minWidth: 36)
    }
}

/// The countdown widget configuration.
struct CountdownWidget: Widget {
    let kind = "CountdownWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CountdownProvider()) { entry in
            CountdownWidgetView(entry: entry)
        }
        .configurationDisplayName("Next Game")
        .description("Countdown to the next game.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
