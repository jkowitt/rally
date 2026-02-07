import SwiftUI
import RallyCore
import RallyUI

// MARK: - Redemption Confirmation View

/// A bottom-sheet flow that walks the user through reward redemption:
/// confirmation prompt, biometric auth, processing indicator, and a
/// success state with the redemption code.
///
/// Triggers haptic feedback on successful redemption.
public struct RedemptionConfirmationView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(ThemeEngine.self) private var themeEngine
    @Bindable private var viewModel: RewardsViewModel

    let reward: Reward

    @State private var showSuccessConfetti = false

    public init(reward: Reward, viewModel: RewardsViewModel) {
        self.reward = reward
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                RallyColors.navy.ignoresSafeArea()

                Group {
                    switch viewModel.redemptionState {
                    case .idle, .confirming:
                        confirmationPrompt
                    case .authenticating:
                        authenticatingView
                    case .processing:
                        processingView
                    case .success(let redemption):
                        successView(redemption)
                    case .failed(let message):
                        failureView(message)
                    }
                }
                .padding(.horizontal, SpacingToken.md)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismissFlow() }
                        .foregroundStyle(RallyColors.gray)
                }
            }
            .interactiveDismissDisabled(
                viewModel.redemptionState == .processing
                    || viewModel.redemptionState == .authenticating
            )
        }
    }

    // MARK: - Confirmation Prompt

    private var confirmationPrompt: some View {
        VStack(spacing: SpacingToken.lg) {
            Spacer()

            // Reward icon
            ZStack {
                Circle()
                    .fill(RallyColors.orange.opacity(0.15))
                    .frame(width: 88, height: 88)
                Image(systemName: "gift.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(RallyColors.orange)
            }

            VStack(spacing: SpacingToken.sm) {
                Text("Redeem Reward?")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)

                Text(reward.title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
            }

            // Cost breakdown
            VStack(spacing: SpacingToken.sm) {
                costRow(label: "Cost", value: "-\(reward.pointsCost.pointsFormatted)", color: RallyColors.error)
                costRow(label: "Current Balance", value: viewModel.currentBalance.pointsFormatted, color: .white)
                Divider().overlay(RallyColors.navyMid)
                costRow(
                    label: "Remaining",
                    value: (viewModel.currentBalance - reward.pointsCost).pointsFormatted,
                    color: RallyColors.success
                )
            }
            .padding(SpacingToken.md)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(RallyColors.navyMid)
            )

            Text("You will need to verify with Face ID or Touch ID to complete this redemption.")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SpacingToken.md)

            Spacer()

            // Action buttons
            VStack(spacing: SpacingToken.smMd) {
                Button {
                    Task { await viewModel.beginRedemption(for: reward) }
                } label: {
                    HStack {
                        Image(systemName: "faceid")
                        Text("Confirm & Redeem")
                    }
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(LinearGradient.rallyBrand)
                    )
                }

                Button("Cancel") { dismissFlow() }
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(RallyColors.gray)
            }
            .padding(.bottom, SpacingToken.md)
        }
    }

    private func costRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
            Spacer()
            Text(value)
                .font(RallyTypography.subtitle)
                .fontWeight(.bold)
                .foregroundStyle(color)
        }
    }

    // MARK: - Authenticating

    private var authenticatingView: some View {
        VStack(spacing: SpacingToken.lg) {
            Spacer()
            Image(systemName: "faceid")
                .font(.system(size: 56))
                .foregroundStyle(RallyColors.orange)
                .symbolEffect(.pulse.wholeSymbol, options: .repeating)
            Text("Authenticating...")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)
            Text("Verify your identity to continue")
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
            Spacer()
        }
    }

    // MARK: - Processing

    private var processingView: some View {
        VStack(spacing: SpacingToken.lg) {
            Spacer()
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.5)
                .tint(RallyColors.orange)
            Text("Processing Redemption...")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)
            Text("Hang tight, we are securing your reward.")
                .font(RallyTypography.subtitle)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)
            Spacer()
        }
    }

    // MARK: - Success

    private func successView(_ redemption: Redemption) -> some View {
        VStack(spacing: SpacingToken.lg) {
            Spacer()

            // Animated checkmark
            ZStack {
                Circle()
                    .fill(RallyColors.success.opacity(0.15))
                    .frame(width: 100, height: 100)
                    .scaleEffect(showSuccessConfetti ? 1.0 : 0.5)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(RallyColors.success)
                    .scaleEffect(showSuccessConfetti ? 1.0 : 0.0)
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: showSuccessConfetti)

            VStack(spacing: SpacingToken.sm) {
                Text("Reward Redeemed!")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)

                Text(reward.title)
                    .font(RallyTypography.subtitle)
                    .foregroundStyle(RallyColors.gray)
            }

            // Redemption code
            if let code = redemption.redemptionCode {
                VStack(spacing: SpacingToken.sm) {
                    Text("Your Redemption Code")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)

                    Text(code)
                        .font(.system(size: 28, weight: .black, design: .monospaced))
                        .foregroundStyle(RallyColors.orange)
                        .kerning(4)
                        .textSelection(.enabled)

                    Text("Show this code at the venue to claim your reward.")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(SpacingToken.lg)
                .background(
                    RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                        .fill(RallyColors.navyMid)
                        .overlay(
                            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                                .strokeBorder(RallyColors.orange.opacity(0.3), lineWidth: 1)
                        )
                )
            }

            if let expiresAt = redemption.expiresAt {
                HStack(spacing: SpacingToken.sm) {
                    Image(systemName: "clock")
                    Text("Valid until \(expiresAt.gamedayFormatted)")
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.warning)
            }

            Spacer()

            Button {
                dismissFlow()
            } label: {
                Text("Done")
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(RallyColors.success)
                    )
            }
            .padding(.bottom, SpacingToken.md)
        }
        .onAppear {
            // Haptic feedback on redemption success
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)

            withAnimation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.1)) {
                showSuccessConfetti = true
            }
        }
    }

    // MARK: - Failure

    private func failureView(_ message: String) -> some View {
        VStack(spacing: SpacingToken.lg) {
            Spacer()

            ZStack {
                Circle()
                    .fill(RallyColors.error.opacity(0.15))
                    .frame(width: 88, height: 88)
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(RallyColors.error)
            }

            VStack(spacing: SpacingToken.sm) {
                Text("Redemption Failed")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)

                Text(message)
                    .font(RallyTypography.subtitle)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            VStack(spacing: SpacingToken.smMd) {
                Button {
                    viewModel.resetRedemptionState()
                } label: {
                    Text("Try Again")
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, SpacingToken.md)
                        .background(
                            RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                                .fill(LinearGradient.rallyBrand)
                        )
                }

                Button("Cancel") { dismissFlow() }
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(RallyColors.gray)
            }
            .padding(.bottom, SpacingToken.md)
        }
        .onAppear {
            // Haptic feedback on failure
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        }
    }

    // MARK: - Helpers

    private func dismissFlow() {
        viewModel.resetRedemptionState()
        dismiss()
    }
}

// MARK: - Preview

#Preview("Redemption Confirmation") {
    RedemptionConfirmationView(
        reward: Reward(
            id: "preview-1",
            schoolID: "school-1",
            title: "Free Large Popcorn",
            description: "Enjoy a free large popcorn at any concession stand.",
            pointsCost: 500,
            category: .concessions,
            minimumTier: .rookie
        ),
        viewModel: RewardsViewModel.__previewStub()
    )
    .environment(ThemeEngine())
}

#Preview("Redemption Success") {
    // Simulates the success state by showing just the view structure.
    Text("Success state with redemption code")
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RallyColors.navy)
        .environment(ThemeEngine())
}
