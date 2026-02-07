import SwiftUI
import RallyCore

/// Gameday activation tile displaying an activity icon, title, points value,
/// and a countdown to the activation window.
///
/// Usage:
/// ```swift
/// ActivationCard(activation: activation) {
///     navigateToActivation(activation)
/// }
/// ```
public struct ActivationCard: View {

    // MARK: - Properties

    @Environment(ThemeEngine.self) private var themeEngine

    private let activation: Activation
    private let onTap: (() -> Void)?

    // MARK: - Init

    /// Creates an activation card.
    /// - Parameters:
    ///   - activation: The activation model to display.
    ///   - onTap: Optional tap handler for navigating to the activation detail.
    public init(activation: Activation, onTap: (() -> Void)? = nil) {
        self.activation = activation
        self.onTap = onTap
    }

    // MARK: - Body

    public var body: some View {
        Button {
            onTap?()
        } label: {
            VStack(alignment: .leading, spacing: RallySpacing.smMd) {
                // Top row: icon + status badge
                HStack {
                    activationIcon
                    Spacer()
                    statusBadge
                }

                // Title
                Text(activation.title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                // Description
                if !activation.description.isEmpty {
                    Text(activation.description)
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 0)

                // Bottom row: points value + countdown
                HStack(alignment: .bottom) {
                    pointsLabel

                    Spacer()

                    if let endsAt = activation.endsAt, activation.status == .active {
                        CountdownTimer(
                            targetDate: endsAt,
                            style: .compact
                        )
                    } else if let startsAt = activation.startsAt, activation.status == .upcoming {
                        CountdownTimer(
                            targetDate: startsAt,
                            style: .compact,
                            label: "Starts in"
                        )
                    }
                }
            }
            .padding(RallySpacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 160)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(RallyColors.navyMid)
            )
            .overlay(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: activation.status == .active ? 1.5 : 0)
            )
            .rallyCardShadow()
        }
        .buttonStyle(.plain)
        .opacity(activation.status == .locked ? 0.5 : 1.0)
        .disabled(activation.status == .locked || activation.status == .completed)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabelText)
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Subviews

    private var activationIcon: some View {
        Image(systemName: iconName)
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(iconColor)
            .frame(width: 40, height: 40)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                    .fill(iconColor.opacity(0.15))
            )
    }

    private var statusBadge: some View {
        Text(statusText)
            .font(RallyTypography.caption)
            .fontWeight(.semibold)
            .foregroundStyle(statusColor)
            .padding(.horizontal, RallySpacing.sm)
            .padding(.vertical, RallySpacing.xs)
            .background(
                Capsule()
                    .fill(statusColor.opacity(0.15))
            )
    }

    private var pointsLabel: some View {
        HStack(spacing: RallySpacing.xs) {
            Image(systemName: "star.fill")
                .font(.system(size: 12))
                .foregroundStyle(RallyColors.orange)

            Text("+\(activation.pointsValue) pts")
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(RallyColors.orange)
        }
    }

    // MARK: - Computed Properties

    private var iconName: String {
        switch activation.type {
        case .prediction: return "chart.bar.fill"
        case .trivia: return "brain.fill"
        case .noiseMeter: return "speaker.wave.3.fill"
        case .poll: return "chart.pie.fill"
        case .photoChallenge: return "camera.fill"
        case .checkIn: return "location.fill"
        case .survey: return "list.clipboard.fill"
        }
    }

    private var iconColor: Color {
        switch activation.status {
        case .active: return themeEngine.activeTheme.primaryColor
        case .upcoming: return RallyColors.blue
        case .completed: return RallyColors.success
        case .locked: return RallyColors.gray
        }
    }

    private var statusText: String {
        switch activation.status {
        case .active: return "LIVE"
        case .upcoming: return "UPCOMING"
        case .completed: return "DONE"
        case .locked: return "LOCKED"
        }
    }

    private var statusColor: Color {
        switch activation.status {
        case .active: return RallyColors.success
        case .upcoming: return RallyColors.blue
        case .completed: return RallyColors.gray
        case .locked: return RallyColors.gray
        }
    }

    private var borderColor: Color {
        activation.status == .active
            ? themeEngine.activeTheme.primaryColor.opacity(0.4)
            : .clear
    }

    private var accessibilityLabelText: String {
        var label = "\(activation.title), \(activation.pointsValue) points"
        switch activation.status {
        case .active: label += ", live now"
        case .upcoming: label += ", upcoming"
        case .completed: label += ", completed"
        case .locked: label += ", locked"
        }
        return label
    }
}

// MARK: - Preview

#Preview("Activation Cards") {
    let activations: [Activation] = [
        Activation(
            id: "1",
            eventID: "e1",
            type: .prediction,
            title: "Halftime Score Prediction",
            description: "Guess the halftime score to earn bonus points!",
            pointsValue: 100,
            startsAt: Date().addingTimeInterval(3600),
            status: .upcoming
        ),
        Activation(
            id: "2",
            eventID: "e1",
            type: .noiseMeter,
            title: "Noise Meter Challenge",
            description: "Make some noise for your team!",
            pointsValue: 50,
            endsAt: Date().addingTimeInterval(300),
            status: .active
        ),
        Activation(
            id: "3",
            eventID: "e1",
            type: .trivia,
            title: "Team Trivia",
            pointsValue: 75,
            status: .locked
        ),
    ]

    ScrollView {
        VStack(spacing: 16) {
            ForEach(activations) { activation in
                ActivationCard(activation: activation)
            }
        }
        .padding()
    }
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
