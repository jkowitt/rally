import SwiftUI
import RallyCore

/// Live countdown timer that displays the remaining days, hours, minutes, and
/// seconds until a target date, with animated digit transitions.
///
/// Available in compact (inline text) and expanded (segmented boxes) styles.
///
/// Usage:
/// ```swift
/// CountdownTimer(targetDate: gameStart, style: .expanded)
/// ```
public struct CountdownTimer: View {

    // MARK: - Style

    /// Display style for the countdown.
    public enum Style {
        /// Single-line inline format (e.g., "2h 15m 30s").
        case compact
        /// Segmented boxes showing each unit separately with labels.
        case expanded
    }

    // MARK: - Properties

    private let targetDate: Date
    private let style: Style
    private let label: String?
    private let onExpired: (() -> Void)?

    @State private var remaining: TimeInterval = 0
    @State private var timer: Timer?

    // MARK: - Init

    /// Creates a countdown timer.
    /// - Parameters:
    ///   - targetDate: The future date to count down to.
    ///   - style: Display variant (default `.expanded`).
    ///   - label: Optional label shown above or before the countdown.
    ///   - onExpired: Closure invoked when the countdown reaches zero.
    public init(
        targetDate: Date,
        style: Style = .expanded,
        label: String? = nil,
        onExpired: (() -> Void)? = nil
    ) {
        self.targetDate = targetDate
        self.style = style
        self.label = label
        self.onExpired = onExpired
    }

    // MARK: - Body

    public var body: some View {
        Group {
            switch style {
            case .compact:
                compactLayout
            case .expanded:
                expandedLayout
            }
        }
        .onAppear { startTimer() }
        .onDisappear { stopTimer() }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabelText)
    }

    // MARK: - Compact Layout

    private var compactLayout: some View {
        HStack(spacing: RallySpacing.xs) {
            if let label {
                Text(label)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            if remaining <= 0 {
                Text("Expired")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.error)
            } else {
                Text(compactString)
                    .font(RallyTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())
                    .monospacedDigit()
            }
        }
    }

    // MARK: - Expanded Layout

    private var expandedLayout: some View {
        VStack(spacing: RallySpacing.sm) {
            if let label {
                Text(label)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                    .textCase(.uppercase)
            }

            if remaining <= 0 {
                Text("Event Started")
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(RallyColors.success)
            } else {
                HStack(spacing: RallySpacing.sm) {
                    if days > 0 {
                        timeSegment(value: days, unit: "DAY")
                    }
                    timeSegment(value: hours, unit: "HR")
                    timeSegment(value: minutes, unit: "MIN")
                    timeSegment(value: seconds, unit: "SEC")
                }
            }
        }
    }

    private func timeSegment(value: Int, unit: String) -> some View {
        VStack(spacing: RallySpacing.xs) {
            Text(String(format: "%02d", value))
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(.white)
                .contentTransition(.numericText(value: Double(value)))
                .monospacedDigit()
                .frame(minWidth: 48)
                .padding(.vertical, RallySpacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                        .fill(RallyColors.navyMid)
                )

            Text(unit)
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
                .fontWeight(.medium)
        }
    }

    // MARK: - Time Calculations

    private var days: Int {
        Int(remaining) / 86400
    }

    private var hours: Int {
        (Int(remaining) % 86400) / 3600
    }

    private var minutes: Int {
        (Int(remaining) % 3600) / 60
    }

    private var seconds: Int {
        Int(remaining) % 60
    }

    private var compactString: String {
        if days > 0 {
            return "\(days)d \(hours)h \(minutes)m"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m \(seconds)s"
        } else {
            return "\(minutes)m \(seconds)s"
        }
    }

    // MARK: - Timer Management

    private func startTimer() {
        updateRemaining()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                updateRemaining()
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func updateRemaining() {
        let interval = targetDate.timeIntervalSinceNow
        if interval <= 0 && remaining > 0 {
            remaining = 0
            onExpired?()
        } else {
            remaining = max(0, interval)
        }
    }

    // MARK: - Accessibility

    private var accessibilityLabelText: String {
        guard remaining > 0 else {
            return label.map { "\($0): expired" } ?? "Timer expired"
        }

        var parts: [String] = []
        if days > 0 { parts.append("\(days) day\(days == 1 ? "" : "s")") }
        if hours > 0 { parts.append("\(hours) hour\(hours == 1 ? "" : "s")") }
        if minutes > 0 { parts.append("\(minutes) minute\(minutes == 1 ? "" : "s")") }
        if seconds > 0 && days == 0 { parts.append("\(seconds) second\(seconds == 1 ? "" : "s")") }

        let timeString = parts.joined(separator: ", ")
        if let label {
            return "\(label): \(timeString) remaining"
        }
        return "\(timeString) remaining"
    }
}

// MARK: - Preview

#Preview("Countdown Timer") {
    VStack(spacing: 32) {
        CountdownTimer(
            targetDate: Date().addingTimeInterval(90061),
            style: .expanded,
            label: "Kickoff"
        )

        CountdownTimer(
            targetDate: Date().addingTimeInterval(3661),
            style: .expanded
        )

        CountdownTimer(
            targetDate: Date().addingTimeInterval(185),
            style: .compact,
            label: "Ends in"
        )

        CountdownTimer(
            targetDate: Date().addingTimeInterval(-10),
            style: .compact,
            label: "Event"
        )
    }
    .padding()
    .background(RallyColors.navy)
}
