import SwiftUI
import RallyCore
import RallyUI

// MARK: - Prediction State

/// Tracks the discrete states of a prediction activation.
enum PredictionState: Equatable {
    case selecting
    case submitting
    case submitted(result: PredictionResult)
    case error(message: String)
}

/// Outcome of a submitted prediction.
struct PredictionResult: Equatable {
    let isCorrect: Bool?
    let pointsEarned: Int
    let message: String?
}

// MARK: - PredictionView

/// Prediction activation view: presents a question with selectable options,
/// submits the user's pick via `ActivationRepositoryProtocol`, and reveals
/// whether the prediction was correct along with points earned.
public struct PredictionView: View {
    let activation: Activation
    @Bindable var viewModel: GamedayViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedOptionID: String?
    @State private var state: PredictionState = .selecting
    @State private var revealCorrect: Bool = false

    public init(activation: Activation, viewModel: GamedayViewModel) {
        self.activation = activation
        self.viewModel = viewModel
    }

    private var question: String {
        activation.payload?.question ?? activation.title
    }

    private var options: [ActivationOption] {
        activation.payload?.options ?? []
    }

    public var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: SpacingToken.lg) {
                    // MARK: Header
                    predictionHeader

                    // MARK: Question
                    questionCard

                    // MARK: Options
                    optionsList

                    // MARK: Result
                    if case .submitted(let result) = state {
                        resultCard(result)
                    }
                }
                .padding(SpacingToken.md)
            }

            // MARK: Bottom CTA
            bottomBar
        }
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle("Prediction")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Close") { dismiss() }
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
    }

    // MARK: - Header

    private var predictionHeader: some View {
        HStack(spacing: SpacingToken.smMd) {
            Image(systemName: "chart.bar.fill")
                .font(.title2)
                .foregroundStyle(ColorToken.accentBlue)

            VStack(alignment: .leading, spacing: 2) {
                Text(activation.title)
                    .font(TypographyToken.cardTitle)
                    .foregroundStyle(.white)
                Text("+\(activation.pointsValue) pts")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.orange)
            }

            Spacer()

            if activation.sponsorID != nil {
                Text("Sponsored")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                    .padding(.horizontal, SpacingToken.sm)
                    .padding(.vertical, SpacingToken.xs)
                    .background(Capsule().fill(ColorToken.navyMid))
            }
        }
    }

    // MARK: - Question

    private var questionCard: some View {
        VStack(spacing: SpacingToken.smMd) {
            Text(question)
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            if let imageURL = activation.payload?.imageURL {
                AsyncImage(url: imageURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous))
                } placeholder: {
                    RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                        .fill(ColorToken.navyMid)
                        .frame(height: 150)
                        .shimmer()
                }
            }
        }
        .padding(SpacingToken.lg)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    // MARK: - Options

    private var optionsList: some View {
        VStack(spacing: SpacingToken.smMd) {
            ForEach(options) { option in
                optionButton(option)
            }
        }
    }

    private func optionButton(_ option: ActivationOption) -> some View {
        let isSelected = selectedOptionID == option.id
        let isSubmitted = state != .selecting && state != .error(message: "")
        let correctID = activation.payload?.correctOptionID

        return Button {
            guard state == .selecting || isErrorState else { return }
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedOptionID = option.id
            }
        } label: {
            HStack(spacing: SpacingToken.smMd) {
                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(borderColor(for: option, isSelected: isSelected, isSubmitted: isSubmitted, correctID: correctID), lineWidth: 2)
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(fillColor(for: option, isSubmitted: isSubmitted, correctID: correctID))
                            .frame(width: 14, height: 14)
                            .transition(.scale)
                    }

                    if revealCorrect && option.id == correctID {
                        Image(systemName: "checkmark")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                    }
                }

                // Option image (optional)
                if let imageURL = option.imageURL {
                    AsyncImage(url: imageURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.clear
                    }
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous))
                }

                Text(option.text)
                    .font(TypographyToken.body)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Result indicator
                if revealCorrect && option.id == correctID {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ColorToken.success)
                }
                if revealCorrect && isSelected && option.id != correctID {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(ColorToken.error)
                }
            }
            .padding(SpacingToken.md)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                    .fill(isSelected ? ColorToken.navyMid : ColorToken.navy)
                    .overlay(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .stroke(
                                borderColor(for: option, isSelected: isSelected, isSubmitted: isSubmitted, correctID: correctID),
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
        }
        .disabled(isSubmitted && !isErrorState)
        .animation(.easeInOut(duration: 0.3), value: revealCorrect)
    }

    // MARK: - Result Card

    private func resultCard(_ result: PredictionResult) -> some View {
        VStack(spacing: SpacingToken.smMd) {
            if let isCorrect = result.isCorrect {
                Image(systemName: isCorrect ? "party.popper.fill" : "hand.thumbsdown.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(isCorrect ? ColorToken.success : ColorToken.error)
            }

            if let message = result.message {
                Text(message)
                    .font(TypographyToken.body)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
            }

            Text("+\(result.pointsEarned) pts")
                .font(TypographyToken.pointsDisplay)
                .foregroundStyle(ColorToken.orange)
        }
        .padding(SpacingToken.lg)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
        .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        VStack(spacing: 0) {
            Divider().overlay(ColorToken.navyMid)

            Group {
                switch state {
                case .selecting:
                    Button {
                        Task { await submitPrediction() }
                    } label: {
                        Text("Lock In Prediction")
                            .font(TypographyToken.buttonLabel)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, SpacingToken.md)
                            .background(
                                RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                                    .fill(selectedOptionID != nil ? LinearGradient.rallyBrand : LinearGradient(colors: [ColorToken.mediumGray], startPoint: .leading, endPoint: .trailing))
                            )
                    }
                    .disabled(selectedOptionID == nil)

                case .submitting:
                    ProgressView("Submitting...")
                        .tint(ColorToken.orange)
                        .foregroundStyle(ColorToken.mediumGray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, SpacingToken.md)

                case .submitted:
                    Button {
                        dismiss()
                    } label: {
                        Text("Done")
                            .font(TypographyToken.buttonLabel)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, SpacingToken.md)
                            .background(
                                RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                                    .fill(ColorToken.success)
                            )
                    }

                case .error(let message):
                    VStack(spacing: SpacingToken.sm) {
                        Text(message)
                            .font(TypographyToken.caption)
                            .foregroundStyle(ColorToken.error)

                        Button {
                            state = .selecting
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
                    }
                }
            }
            .padding(SpacingToken.md)
        }
        .background(ColorToken.navy)
    }

    // MARK: - Submission

    private func submitPrediction() async {
        guard let optionID = selectedOptionID else { return }
        state = .submitting

        do {
            let result = try await viewModel.submitAnswer(
                activationID: activation.id,
                optionID: optionID
            )
            state = .submitted(result: PredictionResult(
                isCorrect: result.isCorrect,
                pointsEarned: result.pointsEarned,
                message: result.message
            ))

            // Animate the correct answer reveal after a short delay
            if activation.payload?.correctOptionID != nil {
                try? await Task.sleep(for: .milliseconds(400))
                withAnimation {
                    revealCorrect = true
                }
            }
        } catch {
            state = .error(message: error.localizedDescription)
        }
    }

    // MARK: - Color Helpers

    private var isErrorState: Bool {
        if case .error = state { return true }
        return false
    }

    private func borderColor(for option: ActivationOption, isSelected: Bool, isSubmitted: Bool, correctID: String?) -> Color {
        if revealCorrect, let correctID {
            if option.id == correctID { return ColorToken.success }
            if option.id == selectedOptionID { return ColorToken.error }
        }
        if isSelected { return ColorToken.orange }
        return ColorToken.mediumGray.opacity(0.3)
    }

    private func fillColor(for option: ActivationOption, isSubmitted: Bool, correctID: String?) -> Color {
        if revealCorrect, let correctID {
            if option.id == correctID { return ColorToken.success }
            if option.id == selectedOptionID { return ColorToken.error }
        }
        return ColorToken.orange
    }
}

// MARK: - Preview

#Preview("Prediction - Selecting") {
    NavigationStack {
        PredictionView(
            activation: Activation(
                id: "pred-1",
                eventID: "evt-1",
                type: .prediction,
                title: "First Score Prediction",
                pointsValue: 50,
                status: .active,
                payload: ActivationPayload(
                    question: "Which team will score the first touchdown?",
                    options: [
                        ActivationOption(id: "opt-1", text: "Home Team - Wildcats"),
                        ActivationOption(id: "opt-2", text: "Away Team - Eagles"),
                        ActivationOption(id: "opt-3", text: "Neither - Field Goal First")
                    ],
                    correctOptionID: "opt-1"
                )
            ),
            viewModel: .preview()
        )
    }
    .environment(ThemeEngine())
}
