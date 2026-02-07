import SwiftUI
import AVFoundation
import RallyCore
import RallyUI

// MARK: - NoiseMeterEngine

/// Captures microphone audio via `AVAudioEngine`, computes RMS power from
/// raw PCM samples, converts to decibels, and maps onto a 0-100 fan scale.
///
/// Configuration per spec:
/// - Sample rate: 44.1 kHz (hardware default)
/// - Buffer size: 1024 frames
/// - Conversion: RMS -> dB -> normalized 0-100 scale
/// - Auto-stop: 60 seconds after start
@MainActor
@Observable
final class NoiseMeterEngine {

    // MARK: - Published State

    /// Current noise level on a 0-100 scale.
    private(set) var currentLevel: Double = 0

    /// Peak noise level captured during this session.
    private(set) var peakLevel: Double = 0

    /// Raw decibel reading (negative scale, where 0 dB = full scale).
    private(set) var decibelReading: Double = -160

    /// Recent waveform samples for visualization (last ~64 values).
    private(set) var waveformSamples: [Double] = []

    /// Whether the engine is actively recording.
    private(set) var isRecording: Bool = false

    /// Seconds remaining before auto-stop.
    private(set) var remainingSeconds: Int = 60

    /// Error message if microphone access fails.
    private(set) var errorMessage: String?

    // MARK: - Constants

    /// Duration in seconds before the meter auto-stops.
    private static let maxDuration: Int = 60

    /// Floor dB level (silence).
    private static let dbFloor: Double = -80.0

    /// Ceiling dB level (maximum expected stadium noise).
    private static let dbCeiling: Double = 0.0

    /// Number of waveform samples to retain for visualization.
    private static let waveformCapacity: Int = 64

    // MARK: - Private

    private var audioEngine: AVAudioEngine?
    private var countdownTask: Task<Void, Never>?

    // MARK: - Lifecycle

    /// Request microphone permission, configure the audio engine, and start recording.
    func start() async {
        guard !isRecording else { return }
        errorMessage = nil

        // Request microphone permission
        let granted: Bool
        if #available(iOS 17, *) {
            granted = await AVAudioApplication.requestRecordPermission()
        } else {
            granted = await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { result in
                    continuation.resume(returning: result)
                }
            }
        }

        guard granted else {
            errorMessage = "Microphone access is required for the Noise Meter. Please enable it in Settings."
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let engine = AVAudioEngine()
            let inputNode = engine.inputNode
            let format = inputNode.outputFormat(forBus: 0)

            // Install a tap: 1024-frame buffer at the hardware sample rate (typically 44.1 kHz).
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.processBuffer(buffer)
            }

            try engine.start()
            self.audioEngine = engine
            isRecording = true
            remainingSeconds = Self.maxDuration
            peakLevel = 0
            waveformSamples = []

            startCountdown()

        } catch {
            errorMessage = "Failed to start audio engine: \(error.localizedDescription)"
        }
    }

    /// Stop recording and tear down the audio engine.
    func stop() {
        countdownTask?.cancel()
        countdownTask = nil

        if let engine = audioEngine {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
        }
        audioEngine = nil
        isRecording = false

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Buffer Processing

    /// Process a single audio buffer: compute RMS, convert to dB, map to 0-100.
    nonisolated private func processBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }
        let channelDataPointer = channelData.pointee
        let frameLength = Int(buffer.frameLength)

        guard frameLength > 0 else { return }

        // Compute RMS (root mean square) of the audio samples.
        var sumOfSquares: Float = 0
        for i in 0..<frameLength {
            let sample = channelDataPointer[i]
            sumOfSquares += sample * sample
        }
        let rms = sqrt(sumOfSquares / Float(frameLength))

        // Convert RMS to decibels (dBFS).
        let db: Double = rms > 0 ? Double(20 * log10(rms)) : NoiseMeterEngine.dbFloor

        // Map dB to 0-100 scale.
        let clamped = max(NoiseMeterEngine.dbFloor, min(NoiseMeterEngine.dbCeiling, db))
        let normalized = (clamped - NoiseMeterEngine.dbFloor) / (NoiseMeterEngine.dbCeiling - NoiseMeterEngine.dbFloor) * 100.0

        Task { @MainActor [weak self] in
            guard let self else { return }
            self.decibelReading = db
            self.currentLevel = normalized
            if normalized > self.peakLevel {
                self.peakLevel = normalized
            }

            // Append to waveform, keeping a fixed capacity.
            self.waveformSamples.append(normalized)
            if self.waveformSamples.count > NoiseMeterEngine.waveformCapacity {
                self.waveformSamples.removeFirst(self.waveformSamples.count - NoiseMeterEngine.waveformCapacity)
            }
        }
    }

    // MARK: - Countdown

    /// Auto-stop after 60 seconds.
    private func startCountdown() {
        countdownTask = Task {
            while remainingSeconds > 0, !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                remainingSeconds -= 1
            }
            if !Task.isCancelled {
                stop()
            }
        }
    }
}

// MARK: - NoiseMeterView

/// Noise meter activation: displays real-time audio level, a waveform
/// visualization, peak reading, and submits the result when complete.
public struct NoiseMeterView: View {
    let activation: Activation
    @Bindable var viewModel: GamedayViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var engine = NoiseMeterEngine()
    @State private var hasSubmitted: Bool = false
    @State private var submissionResult: SubmissionResult?
    @State private var submissionError: String?

    public init(activation: Activation, viewModel: GamedayViewModel) {
        self.activation = activation
        self.viewModel = viewModel
    }

    public var body: some View {
        VStack(spacing: SpacingToken.lg) {
            // MARK: Header
            noiseMeterHeader

            Spacer()

            // MARK: Level Gauge
            levelGauge

            // MARK: Waveform
            waveformView

            // MARK: Stats Row
            statsRow

            Spacer()

            // MARK: Error
            if let error = engine.errorMessage {
                Text(error)
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.error)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, SpacingToken.md)
            }

            // MARK: Result
            if let result = submissionResult {
                resultBanner(result)
            }

            // MARK: Action
            actionButton
        }
        .padding(SpacingToken.md)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle("Noise Meter")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Close") { dismiss() }
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
        .onChange(of: engine.isRecording) { _, isRecording in
            if !isRecording && !hasSubmitted && engine.peakLevel > 0 {
                Task { await submitReading() }
            }
        }
        .onDisappear {
            engine.stop()
        }
    }

    // MARK: - Header

    private var noiseMeterHeader: some View {
        HStack {
            Image(systemName: "waveform")
                .font(.title2)
                .foregroundStyle(ColorToken.success)

            VStack(alignment: .leading, spacing: 2) {
                Text(activation.title)
                    .font(TypographyToken.cardTitle)
                    .foregroundStyle(.white)
                Text("+\(activation.pointsValue) pts")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.orange)
            }

            Spacer()

            if engine.isRecording {
                HStack(spacing: SpacingToken.xs) {
                    Circle()
                        .fill(ColorToken.error)
                        .frame(width: 8, height: 8)
                    Text("\(engine.remainingSeconds)s")
                        .font(TypographyToken.buttonLabel)
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, SpacingToken.sm)
                .padding(.vertical, SpacingToken.xs)
                .background(Capsule().fill(ColorToken.error.opacity(0.2)))
            }
        }
    }

    // MARK: - Level Gauge

    private var levelGauge: some View {
        ZStack {
            // Background track
            Circle()
                .trim(from: 0.15, to: 0.85)
                .stroke(ColorToken.navyMid, style: StrokeStyle(lineWidth: 20, lineCap: .round))
                .frame(width: 220, height: 220)

            // Filled arc
            Circle()
                .trim(from: 0.15, to: 0.15 + 0.7 * engine.currentLevel / 100)
                .stroke(
                    gaugeGradient,
                    style: StrokeStyle(lineWidth: 20, lineCap: .round)
                )
                .frame(width: 220, height: 220)
                .animation(.easeOut(duration: 0.15), value: engine.currentLevel)

            // Center readout
            VStack(spacing: SpacingToken.xs) {
                Text("\(Int(engine.currentLevel))")
                    .font(.system(size: 56, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(.easeOut(duration: 0.1), value: Int(engine.currentLevel))

                Text("NOISE LEVEL")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
    }

    private var gaugeGradient: AngularGradient {
        AngularGradient(
            gradient: Gradient(colors: [ColorToken.success, ColorToken.warning, ColorToken.error]),
            center: .center,
            startAngle: .degrees(54),    // 0.15 * 360
            endAngle: .degrees(306)      // 0.85 * 360
        )
    }

    // MARK: - Waveform

    private var waveformView: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            let samples = engine.waveformSamples
            let barCount = min(samples.count, Int(width / 5))
            let barWidth: CGFloat = 3
            let spacing = max(1, (width - CGFloat(barCount) * barWidth) / max(1, CGFloat(barCount - 1)))

            HStack(spacing: spacing) {
                ForEach(Array(samples.suffix(barCount).enumerated()), id: \.offset) { _, sample in
                    RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                        .fill(waveformBarColor(sample))
                        .frame(width: barWidth, height: max(2, height * sample / 100))
                        .animation(.easeOut(duration: 0.08), value: sample)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
        .frame(height: 80)
        .padding(.horizontal, SpacingToken.sm)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    private func waveformBarColor(_ level: Double) -> Color {
        if level > 75 { return ColorToken.error }
        if level > 45 { return ColorToken.warning }
        return ColorToken.success
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: SpacingToken.lg) {
            statItem(label: "CURRENT", value: "\(Int(engine.currentLevel))")
            Divider().frame(height: 36).overlay(ColorToken.navyMid)
            statItem(label: "PEAK", value: "\(Int(engine.peakLevel))")
            Divider().frame(height: 36).overlay(ColorToken.navyMid)
            statItem(label: "dB", value: String(format: "%.0f", engine.decibelReading))
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    private func statItem(label: String, value: String) -> some View {
        VStack(spacing: SpacingToken.xs) {
            Text(label)
                .font(TypographyToken.caption)
                .foregroundStyle(ColorToken.mediumGray)
            Text(value)
                .font(TypographyToken.cardTitle)
                .foregroundStyle(.white)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Result Banner

    private func resultBanner(_ result: SubmissionResult) -> some View {
        HStack(spacing: SpacingToken.smMd) {
            Image(systemName: "speaker.wave.3.fill")
                .font(.title3)
                .foregroundStyle(ColorToken.success)

            VStack(alignment: .leading, spacing: 2) {
                Text("Submitted!")
                    .font(TypographyToken.cardTitle)
                    .foregroundStyle(.white)
                if let message = result.message {
                    Text(message)
                        .font(TypographyToken.caption)
                        .foregroundStyle(ColorToken.mediumGray)
                }
            }

            Spacer()

            Text("+\(result.pointsEarned) pts")
                .font(TypographyToken.pointsDisplay)
                .foregroundStyle(ColorToken.orange)
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.success.opacity(0.1))
        )
        .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
    }

    // MARK: - Action Button

    @ViewBuilder
    private var actionButton: some View {
        if hasSubmitted {
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
        } else if engine.isRecording {
            Button {
                engine.stop()
            } label: {
                Text("Stop Recording")
                    .font(TypographyToken.buttonLabel)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SpacingToken.md)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                            .fill(ColorToken.error)
                    )
            }
        } else {
            Button {
                Task { await engine.start() }
            } label: {
                HStack(spacing: SpacingToken.sm) {
                    Image(systemName: "mic.fill")
                    Text("Start Noise Meter")
                }
                .font(TypographyToken.buttonLabel)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, SpacingToken.md)
                .background(
                    RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                        .fill(LinearGradient.rallyBrand)
                )
            }
        }

        if let error = submissionError {
            Text(error)
                .font(TypographyToken.caption)
                .foregroundStyle(ColorToken.error)
        }
    }

    // MARK: - Submission

    private func submitReading() async {
        guard !hasSubmitted else { return }

        do {
            let result = try await viewModel.submitNoiseMeter(
                activationID: activation.id,
                decibelLevel: engine.peakLevel
            )
            submissionResult = result
            hasSubmitted = true
        } catch {
            submissionError = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview("Noise Meter") {
    NavigationStack {
        NoiseMeterView(
            activation: Activation(
                id: "noise-1",
                eventID: "evt-1",
                type: .noiseMeter,
                title: "Halftime Noise Check",
                pointsValue: 30,
                status: .active
            ),
            viewModel: .preview()
        )
    }
    .environment(ThemeEngine())
}
