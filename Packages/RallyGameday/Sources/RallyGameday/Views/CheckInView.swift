import SwiftUI
import RallyCore
import RallyUI

// MARK: - CheckInView

/// Check-in flow UI that walks the user through location verification,
/// beacon detection, and a confirmation animation with points earned.
///
/// The flow is driven by `GamedayViewModel.checkInState`:
///   idle -> verifyingLocation -> scanningBeacon -> [beaconFound] -> submitting -> success | failed
public struct CheckInView: View {
    @Bindable var viewModel: GamedayViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var pulseScale: CGFloat = 1.0
    @State private var confettiTrigger: Int = 0
    @State private var showPointsBurst: Bool = false

    public init(viewModel: GamedayViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        VStack(spacing: SpacingToken.xl) {
            Spacer()

            // MARK: Status Illustration
            statusIllustration

            // MARK: Status Text
            statusContent

            Spacer()

            // MARK: Action Button
            actionButton
        }
        .padding(SpacingToken.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle("Check In")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel.checkInState == .idle {
                await viewModel.startCheckIn()
            }
        }
    }

    // MARK: - Status Illustration

    @ViewBuilder
    private var statusIllustration: some View {
        switch viewModel.checkInState {
        case .idle, .verifyingLocation:
            locationVerificationGraphic

        case .scanningBeacon:
            beaconScanGraphic

        case .beaconFound:
            beaconFoundGraphic

        case .submitting:
            submittingGraphic

        case .success(let points):
            successGraphic(pointsEarned: points)

        case .failed:
            failedGraphic
        }
    }

    private var locationVerificationGraphic: some View {
        ZStack {
            // Pulsing rings
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .stroke(ColorToken.accentBlue.opacity(0.3 - Double(index) * 0.1), lineWidth: 2)
                    .frame(width: CGFloat(120 + index * 40), height: CGFloat(120 + index * 40))
                    .scaleEffect(pulseScale)
                    .animation(
                        .easeInOut(duration: 1.5)
                        .repeatForever(autoreverses: true)
                        .delay(Double(index) * 0.3),
                        value: pulseScale
                    )
            }

            Circle()
                .fill(ColorToken.accentBlue.opacity(0.15))
                .frame(width: 100, height: 100)

            Image(systemName: "location.fill")
                .font(.system(size: 40))
                .foregroundStyle(ColorToken.accentBlue)
        }
        .onAppear { pulseScale = 1.15 }
    }

    private var beaconScanGraphic: some View {
        ZStack {
            // Radar sweep
            ForEach(0..<4, id: \.self) { index in
                Circle()
                    .stroke(ColorToken.orange.opacity(0.25 - Double(index) * 0.05), lineWidth: 1.5)
                    .frame(width: CGFloat(80 + index * 35), height: CGFloat(80 + index * 35))
                    .scaleEffect(pulseScale)
                    .animation(
                        .easeOut(duration: 2.0)
                        .repeatForever(autoreverses: false)
                        .delay(Double(index) * 0.4),
                        value: pulseScale
                    )
            }

            Circle()
                .fill(ColorToken.orange.opacity(0.15))
                .frame(width: 80, height: 80)

            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 36))
                .foregroundStyle(ColorToken.orange)
                .symbolEffect(.variableColor.iterative, options: .repeating)
        }
        .onAppear { pulseScale = 1.3 }
    }

    private var beaconFoundGraphic: some View {
        ZStack {
            Circle()
                .fill(ColorToken.success.opacity(0.15))
                .frame(width: 120, height: 120)

            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 40))
                .foregroundStyle(ColorToken.success)
                .symbolEffect(.bounce, value: viewModel.checkInState)
        }
    }

    private var submittingGraphic: some View {
        ZStack {
            Circle()
                .fill(ColorToken.navyMid)
                .frame(width: 120, height: 120)

            ProgressView()
                .tint(ColorToken.orange)
                .scaleEffect(1.8)
        }
    }

    private func successGraphic(pointsEarned: Int) -> some View {
        VStack(spacing: SpacingToken.md) {
            ZStack {
                Circle()
                    .fill(ColorToken.success.opacity(0.15))
                    .frame(width: 120, height: 120)
                    .scaleEffect(showPointsBurst ? 1.0 : 0.5)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: showPointsBurst)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(ColorToken.success)
                    .scaleEffect(showPointsBurst ? 1.0 : 0.0)
                    .animation(.spring(response: 0.4, dampingFraction: 0.5).delay(0.1), value: showPointsBurst)
            }

            if showPointsBurst {
                Text("+\(pointsEarned)")
                    .font(TypographyToken.heroTitle)
                    .foregroundStyle(ColorToken.orange)
                    .transition(.asymmetric(
                        insertion: .scale.combined(with: .opacity),
                        removal: .opacity
                    ))

                Text("Points Earned!")
                    .font(TypographyToken.subtitle)
                    .foregroundStyle(ColorToken.mediumGray)
                    .transition(.opacity)
            }
        }
        .onAppear {
            withAnimation {
                showPointsBurst = true
            }
        }
    }

    private var failedGraphic: some View {
        ZStack {
            Circle()
                .fill(ColorToken.error.opacity(0.15))
                .frame(width: 120, height: 120)

            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 44))
                .foregroundStyle(ColorToken.error)
        }
    }

    // MARK: - Status Content

    @ViewBuilder
    private var statusContent: some View {
        switch viewModel.checkInState {
        case .idle:
            statusText(title: "Preparing Check-In", subtitle: "Getting ready to verify your location...")

        case .verifyingLocation:
            statusText(title: "Verifying Location", subtitle: "Confirming you are at the venue via GPS...")

        case .scanningBeacon:
            statusText(title: "Scanning for Beacons", subtitle: "Looking for venue beacons nearby for extra verification...")

        case .beaconFound:
            statusText(title: "Beacon Detected!", subtitle: "Venue beacon confirmed. Submitting your check-in...")

        case .submitting:
            statusText(title: "Submitting", subtitle: "Recording your attendance...")

        case .success:
            statusText(title: "You're Checked In!", subtitle: "Welcome to gameday. Earn more points with activations below.")

        case .failed(let message):
            statusText(title: "Check-In Failed", subtitle: message)
        }
    }

    private func statusText(title: String, subtitle: String) -> some View {
        VStack(spacing: SpacingToken.sm) {
            Text(title)
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(subtitle)
                .font(TypographyToken.body)
                .foregroundStyle(ColorToken.mediumGray)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Action Button

    @ViewBuilder
    private var actionButton: some View {
        switch viewModel.checkInState {
        case .success:
            Button {
                dismiss()
            } label: {
                Text("Continue to Gameday")
                    .font(TypographyToken.buttonLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(LinearGradient.rallyBrand)
                    )
            }

        case .failed:
            VStack(spacing: SpacingToken.smMd) {
                Button {
                    viewModel.resetCheckIn()
                    Task { await viewModel.startCheckIn() }
                } label: {
                    Text("Try Again")
                        .font(TypographyToken.buttonLabel)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, SpacingToken.md)
                        .background(
                            RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                                .fill(ColorToken.orange)
                        )
                }

                Button {
                    dismiss()
                } label: {
                    Text("Cancel")
                        .font(TypographyToken.buttonLabel)
                        .foregroundStyle(ColorToken.mediumGray)
                }
            }

        default:
            // During in-progress states, show a disabled / loading indicator
            EmptyView()
        }
    }
}

// MARK: - Preview

#Preview("Check-In - Idle") {
    NavigationStack {
        CheckInView(viewModel: .preview())
    }
    .environment(ThemeEngine())
}
