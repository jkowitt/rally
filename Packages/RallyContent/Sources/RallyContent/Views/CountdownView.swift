import SwiftUI
import RallyCore
import RallyUI

/// Animated countdown timer that displays the time remaining until the next
/// event. Updates every second with a smooth digit-flip animation.
public struct CountdownView: View {
    private let event: Event
    private let style: CountdownStyle

    @State private var days = 0
    @State private var hours = 0
    @State private var minutes = 0
    @State private var seconds = 0
    @State private var isExpired = false
    @State private var timerTask: Task<Void, Never>?

    public enum CountdownStyle: Sendable {
        /// Full card layout with event details and large timer.
        case card
        /// Compact inline layout suitable for embedding in a feed.
        case inline
    }

    public init(event: Event, style: CountdownStyle = .card) {
        self.event = event
        self.style = style
    }

    public var body: some View {
        Group {
            switch style {
            case .card:
                cardLayout
            case .inline:
                inlineLayout
            }
        }
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
    }

    // MARK: - Card Layout

    private var cardLayout: some View {
        VStack(spacing: SpacingToken.md) {
            // Event header
            VStack(spacing: SpacingToken.xs) {
                Text("NEXT EVENT")
                    .font(TypographyToken.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(ColorToken.orange)
                    .tracking(1.5)

                Text(event.title)
                    .font(TypographyToken.sectionHeader)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)

                HStack(spacing: SpacingToken.xs) {
                    Text("vs \(event.opponent)")
                        .font(TypographyToken.subtitle)
                        .foregroundStyle(.white.opacity(0.8))

                    Circle()
                        .fill(.white.opacity(0.4))
                        .frame(width: 4, height: 4)

                    Text(event.startTime.gamedayFormatted)
                        .font(TypographyToken.subtitle)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            // Timer digits
            if isExpired {
                expiredBadge
            } else {
                timerDigits
            }
        }
        .padding(.vertical, SpacingToken.lg)
        .padding(.horizontal, SpacingToken.md)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [ColorToken.navy, ColorToken.navy.opacity(0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card))
        .shadow(
            color: ShadowToken.elevatedColor,
            radius: ShadowToken.elevatedRadius,
            x: ShadowToken.elevatedX,
            y: ShadowToken.elevatedY
        )
    }

    // MARK: - Inline Layout

    private var inlineLayout: some View {
        HStack(spacing: SpacingToken.md) {
            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                Text(event.title)
                    .font(TypographyToken.cardTitle)
                    .foregroundStyle(ColorToken.navy)
                    .lineLimit(1)

                Text("vs \(event.opponent) \u{2022} \(event.startTime.gamedayFormatted)")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
            }

            Spacer()

            if isExpired {
                Text("LIVE")
                    .font(TypographyToken.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, SpacingToken.sm)
                    .padding(.vertical, SpacingToken.xs)
                    .background(ColorToken.error)
                    .clipShape(Capsule())
            } else {
                compactTimer
            }
        }
        .padding(SpacingToken.md)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card))
        .shadow(
            color: ShadowToken.cardColor,
            radius: ShadowToken.cardRadius,
            x: ShadowToken.cardX,
            y: ShadowToken.cardY
        )
    }

    // MARK: - Timer Digits (Card)

    private var timerDigits: some View {
        HStack(spacing: SpacingToken.smMd) {
            timerUnit(value: days, label: "DAYS")
            timerSeparator
            timerUnit(value: hours, label: "HRS")
            timerSeparator
            timerUnit(value: minutes, label: "MIN")
            timerSeparator
            timerUnit(value: seconds, label: "SEC")
        }
    }

    private func timerUnit(value: Int, label: String) -> some View {
        VStack(spacing: SpacingToken.xs) {
            Text(String(format: "%02d", value))
                .font(TypographyToken.pointsDisplay)
                .foregroundStyle(.white)
                .monospacedDigit()
                .contentTransition(.numericText())
                .animation(.spring(response: 0.3, dampingFraction: 0.8), value: value)

            Text(label)
                .font(TypographyToken.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.6))
                .tracking(1)
        }
        .frame(minWidth: 52)
    }

    private var timerSeparator: some View {
        Text(":")
            .font(TypographyToken.pointsDisplay)
            .foregroundStyle(.white.opacity(0.4))
            .offset(y: -8)
    }

    // MARK: - Compact Timer (Inline)

    private var compactTimer: some View {
        HStack(spacing: 2) {
            if days > 0 {
                Text("\(days)d")
                    .monospacedDigit()
            }
            Text("\(String(format: "%02d", hours)):\(String(format: "%02d", minutes)):\(String(format: "%02d", seconds))")
                .monospacedDigit()
                .contentTransition(.numericText())
                .animation(.linear(duration: 0.2), value: seconds)
        }
        .font(TypographyToken.subtitle)
        .fontWeight(.bold)
        .foregroundStyle(ColorToken.orange)
    }

    // MARK: - Expired Badge

    private var expiredBadge: some View {
        HStack(spacing: SpacingToken.sm) {
            Circle()
                .fill(ColorToken.error)
                .frame(width: 8, height: 8)
                .overlay(
                    Circle()
                        .fill(ColorToken.error.opacity(0.4))
                        .frame(width: 16, height: 16)
                )

            Text("GAME TIME")
                .font(TypographyToken.cardTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)
        }
        .padding(.vertical, SpacingToken.sm)
    }

    // MARK: - Timer Logic

    private func startTimer() {
        updateCountdown()
        timerTask = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { break }
                updateCountdown()
            }
        }
    }

    private func stopTimer() {
        timerTask?.cancel()
        timerTask = nil
    }

    private func updateCountdown() {
        guard let components = event.startTime.countdownComponents else {
            isExpired = true
            return
        }
        days = components.days
        hours = components.hours
        minutes = components.minutes
        seconds = components.seconds
        isExpired = false
    }
}

// MARK: - Preview

#Preview("Countdown - Card") {
    VStack(spacing: 20) {
        CountdownView(
            event: Event(
                id: "evt-1",
                schoolID: "school-001",
                sport: .football,
                title: "Homecoming Game",
                opponent: "State Rivals",
                venueID: "venue-001",
                startTime: Date.now.addingTimeInterval(86_400 * 3 + 3_600 * 5 + 60 * 23 + 45)
            ),
            style: .card
        )

        CountdownView(
            event: Event(
                id: "evt-2",
                schoolID: "school-001",
                sport: .basketball,
                title: "Conference Opener",
                opponent: "Northern U",
                venueID: "venue-002",
                startTime: Date.now.addingTimeInterval(3_600 * 2 + 60 * 15)
            ),
            style: .card
        )
    }
    .padding()
}

#Preview("Countdown - Inline") {
    VStack(spacing: 12) {
        CountdownView(
            event: Event(
                id: "evt-3",
                schoolID: "school-001",
                sport: .football,
                title: "Season Opener",
                opponent: "Western State",
                venueID: "venue-001",
                startTime: Date.now.addingTimeInterval(86_400 * 7)
            ),
            style: .inline
        )

        CountdownView(
            event: Event(
                id: "evt-4",
                schoolID: "school-001",
                sport: .basketball,
                title: "Rivalry Game",
                opponent: "East Tech",
                venueID: "venue-002",
                startTime: Date.now.addingTimeInterval(3_600)
            ),
            style: .inline
        )
    }
    .padding()
}
