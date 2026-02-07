import SwiftUI
import RallyCore
import RallyUI

// MARK: - Trivia State

/// Tracks the discrete states of a trivia activation.
enum TriviaState: Equatable {
    case answering
    case submitting
    case revealed(isCorrect: Bool, pointsEarned: Int, message: String?)
    case timedOut
    case error(message: String)
}

// MARK: - TriviaView

/// Trivia activation view with a timed countdown.
///
/// Presents a question with multiple-choice options and a visual countdown timer.
/// The user must answer before time runs out. On expiration the activation
/// auto-submits or locks. Results are revealed with correct-answer highlighting.
public struct TriviaView: View {
    let activation: Activation
    @Bindable var viewModel: GamedayViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedOptionID: String?
    @State private var state: TriviaState = .answering
    @State private var remainingTime: TimeInterval
    @State private var timerTask: Task<Void, Never>?
    @State private var revealCorrect: Bool = false

    private let timeLimit: TimeInterval
    private var question: String { activation.payload?.question ?? activation.title }
    private var options: [ActivationOption] { activation.payload?.options ?? [] }
    private var correctOptionID: String? { activation.payload?.correctOptionID }

    public init(activation: Activation, viewModel: GamedayViewModel) {
        self.activation = activation
        self.viewModel = viewModel
        let limit = activation.payload?.timeLimit ?? 15
        self.timeLimit = limit
        self._remainingTime = State(initialValue: limit)
    }

    public var body: some View {
        VStack(spacing: 0) {
            // MARK: Timer Bar
            timerBar

            ScrollView {
                VStack(spacing: SpacingToken.lg) {
                    // MARK: Header
                    triviaHeader

                    // MARK: Question
                    questionSection

                    // MARK: Options
                    optionsSection

                    // MARK: Result
                    if case .revealed(let isCorrect, let points, let message) = state {
                        resultSection(isCorrect: isCorrect, pointsEarned: points, message: message)
                    }

                    if case .timedOut = state {
                        timeOutSection
                    }
                }
                .padding(SpacingToken.md)
            }

            // MARK: Bottom Action
            bottomAction
        }
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle("Trivia")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Close") { dismiss() }
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
        .onAppear { startTimer() }
        .onDisappear { timerTask?.cancel() }
    }

    // MARK: - Timer Bar

    private var timerBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(ColorToken.navyMid)

                Rectangle()
                    .fill(timerColor)
                    .frame(width: geometry.size.width * timerProgress)
                    .animation(.linear(duration: 0.1), value: remainingTime)
            }
        }
        .frame(height: 6)
    }

    private var timerProgress: Double {
        guard timeLimit > 0 else { return 0 }
        return max(0, remainingTime / timeLimit)
    }

    private var timerColor: Color {
        let ratio = timerProgress
        if ratio > 0.5 { return ColorToken.success }
        if ratio > 0.25 { return ColorToken.warning }
        return ColorToken.error
    }

    // MARK: - Header

    private var triviaHeader: some View {
        HStack {
            Image(systemName: "brain.head.profile")
                .font(.title2)
                .foregroundStyle(ColorToken.warning)

            VStack(alignment: .leading, spacing: 2) {
                Text(activation.title)
                    .font(TypographyToken.cardTitle)
                    .foregroundStyle(.white)
                Text("+\(activation.pointsValue) pts")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.orange)
            }

            Spacer()

            // Countdown display
            HStack(spacing: SpacingToken.xs) {
                Image(systemName: "clock.fill")
                    .font(.caption)
                Text(timerText)
                    .font(TypographyToken.buttonLabel)
                    .monospacedDigit()
            }
            .foregroundStyle(timerColor)
            .padding(.horizontal, SpacingToken.sm)
            .padding(.vertical, SpacingToken.xs)
            .background(Capsule().fill(timerColor.opacity(0.15)))
        }
    }

    private var timerText: String {
        let seconds = Int(ceil(max(0, remainingTime)))
        return "\(seconds)s"
    }

    // MARK: - Question

    private var questionSection: some View {
        Text(question)
            .font(TypographyToken.sectionHeader)
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(SpacingToken.lg)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(ColorToken.navyMid)
            )
    }

    // MARK: - Options

    private var optionsSection: some View {
        VStack(spacing: SpacingToken.smMd) {
            ForEach(options) { option in
                triviaOptionButton(option)
            }
        }
    }

    private func triviaOptionButton(_ option: ActivationOption) -> some View {
        let isSelected = selectedOptionID == option.id
        let isLocked = state != .answering
        let isCorrectOption = option.id == correctOptionID

        return Button {
            guard state == .answering else { return }
            withAnimation(.easeInOut(duration: 0.15)) {
                selectedOptionID = option.id
            }
        } label: {
            HStack(spacing: SpacingToken.smMd) {
                // Letter badge (A, B, C, D...)
                if let index = options.firstIndex(where: { $0.id == option.id }) {
                    let letter = String(UnicodeScalar("A".unicodeScalars.first!.value + UInt32(index))!)
                    Text(letter)
                        .font(TypographyToken.buttonLabel)
                        .foregroundStyle(isSelected ? .white : ColorToken.mediumGray)
                        .frame(width: 32, height: 32)
                        .background(
                            Circle()
                                .fill(optionBadgeColor(isSelected: isSelected, isCorrect: isCorrectOption, isLocked: isLocked))
                        )
                }

                Text(option.text)
                    .font(TypographyToken.body)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Result indicator
                if revealCorrect && isCorrectOption {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ColorToken.success)
                        .transition(.scale.combined(with: .opacity))
                }
                if revealCorrect && isSelected && !isCorrectOption {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(ColorToken.error)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(SpacingToken.md)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                    .fill(optionBackgroundColor(isSelected: isSelected, isCorrect: isCorrectOption, isLocked: isLocked))
                    .overlay(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .stroke(
                                optionBorderColor(isSelected: isSelected, isCorrect: isCorrectOption, isLocked: isLocked),
                                lineWidth: isSelected ? 2 : 1
                            )
                    )
            )
        }
        .disabled(isLocked)
        .animation(.easeInOut(duration: 0.3), value: revealCorrect)
    }

    // MARK: - Result

    private func resultSection(isCorrect: Bool, pointsEarned: Int, message: String?) -> some View {
        VStack(spacing: SpacingToken.smMd) {
            Image(systemName: isCorrect ? "star.fill" : "xmark.circle")
                .font(.system(size: 40))
                .foregroundStyle(isCorrect ? ColorToken.warning : ColorToken.error)

            Text(isCorrect ? "Correct!" : "Not Quite")
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)

            if let message {
                Text(message)
                    .font(TypographyToken.body)
                    .foregroundStyle(ColorToken.mediumGray)
                    .multilineTextAlignment(.center)
            }

            Text("+\(pointsEarned) pts")
                .font(TypographyToken.pointsDisplay)
                .foregroundStyle(ColorToken.orange)
        }
        .padding(SpacingToken.lg)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(isCorrect ? ColorToken.success.opacity(0.1) : ColorToken.error.opacity(0.1))
        )
        .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
    }

    private var timeOutSection: some View {
        VStack(spacing: SpacingToken.smMd) {
            Image(systemName: "clock.badge.xmark")
                .font(.system(size: 40))
                .foregroundStyle(ColorToken.error)

            Text("Time's Up!")
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)

            Text("You ran out of time for this question.")
                .font(TypographyToken.body)
                .foregroundStyle(ColorToken.mediumGray)
                .multilineTextAlignment(.center)
        }
        .padding(SpacingToken.lg)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.error.opacity(0.1))
        )
        .transition(.asymmetric(insertion: .scale.combined(with: .opacity), removal: .opacity))
    }

    // MARK: - Bottom Action

    private var bottomAction: some View {
        VStack(spacing: 0) {
            Divider().overlay(ColorToken.navyMid)

            Group {
                switch state {
                case .answering:
                    Button {
                        Task { await submitTrivia() }
                    } label: {
                        Text("Submit Answer")
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

                case .revealed, .timedOut:
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
                                    .fill(ColorToken.orange)
                            )
                    }

                case .error(let message):
                    VStack(spacing: SpacingToken.sm) {
                        Text(message)
                            .font(TypographyToken.caption)
                            .foregroundStyle(ColorToken.error)
                        Button {
                            state = .answering
                            startTimer()
                        } label: {
                            Text("Retry")
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

    // MARK: - Timer

    private func startTimer() {
        timerTask?.cancel()
        remainingTime = timeLimit

        timerTask = Task {
            while remainingTime > 0, !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(100))
                guard !Task.isCancelled else { return }
                remainingTime -= 0.1

                if remainingTime <= 0 {
                    await handleTimeout()
                }
            }
        }
    }

    private func handleTimeout() async {
        guard state == .answering else { return }

        timerTask?.cancel()
        remainingTime = 0

        // If user had selected an option, auto-submit it
        if selectedOptionID != nil {
            await submitTrivia()
        } else {
            withAnimation {
                state = .timedOut
            }
        }
    }

    // MARK: - Submission

    private func submitTrivia() async {
        guard let optionID = selectedOptionID else { return }
        timerTask?.cancel()
        state = .submitting

        do {
            let result = try await viewModel.submitAnswer(
                activationID: activation.id,
                optionID: optionID
            )

            let isCorrect = result.isCorrect ?? (optionID == correctOptionID)
            state = .revealed(isCorrect: isCorrect, pointsEarned: result.pointsEarned, message: result.message)

            // Reveal correct answer after brief delay
            try? await Task.sleep(for: .milliseconds(300))
            withAnimation {
                revealCorrect = true
            }
        } catch {
            state = .error(message: error.localizedDescription)
        }
    }

    // MARK: - Color Helpers

    private func optionBadgeColor(isSelected: Bool, isCorrect: Bool, isLocked: Bool) -> Color {
        if revealCorrect && isCorrect { return ColorToken.success }
        if revealCorrect && isSelected && !isCorrect { return ColorToken.error }
        if isSelected { return ColorToken.orange }
        return ColorToken.navyMid
    }

    private func optionBackgroundColor(isSelected: Bool, isCorrect: Bool, isLocked: Bool) -> Color {
        if revealCorrect && isCorrect { return ColorToken.success.opacity(0.1) }
        if revealCorrect && isSelected && !isCorrect { return ColorToken.error.opacity(0.1) }
        return isSelected ? ColorToken.navyMid : ColorToken.navy
    }

    private func optionBorderColor(isSelected: Bool, isCorrect: Bool, isLocked: Bool) -> Color {
        if revealCorrect && isCorrect { return ColorToken.success }
        if revealCorrect && isSelected && !isCorrect { return ColorToken.error }
        if isSelected { return ColorToken.orange }
        return ColorToken.mediumGray.opacity(0.2)
    }
}

// MARK: - Preview

#Preview("Trivia - Answering") {
    NavigationStack {
        TriviaView(
            activation: Activation(
                id: "trivia-1",
                eventID: "evt-1",
                type: .trivia,
                title: "Mascot Trivia",
                pointsValue: 25,
                status: .active,
                payload: ActivationPayload(
                    question: "In what year was the university mascot first introduced at a football game?",
                    options: [
                        ActivationOption(id: "a", text: "1952"),
                        ActivationOption(id: "b", text: "1967"),
                        ActivationOption(id: "c", text: "1978"),
                        ActivationOption(id: "d", text: "1983")
                    ],
                    correctOptionID: "b",
                    timeLimit: 15
                )
            ),
            viewModel: .preview()
        )
    }
    .environment(ThemeEngine())
}
