import SwiftUI
import RallyCore
import RallyUI

// MARK: - GamedayView

/// Main gameday screen displaying event info, live score, activations list,
/// and the check-in call-to-action. Acts as the navigation hub for all
/// gameday sub-experiences (predictions, trivia, noise meter, leaderboard).
public struct GamedayView: View {
    @Bindable var viewModel: GamedayViewModel
    @Environment(ThemeEngine.self) private var themeEngine
    @State private var selectedActivation: Activation?
    @State private var showLeaderboard: Bool = false

    public init(viewModel: GamedayViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: SpacingToken.lg) {
                // MARK: Event Header
                eventHeader

                // MARK: Live Score Banner
                if viewModel.phase == .live || viewModel.phase == .checkedIn {
                    scoreBanner
                }

                // MARK: Check-In CTA
                if !viewModel.hasCheckedIn && viewModel.phase == .checkInAvailable {
                    checkInCTA
                }

                // MARK: Points Summary
                if viewModel.hasCheckedIn {
                    pointsSummary
                }

                // MARK: Activations List
                if !viewModel.activations.isEmpty {
                    activationsSection
                }

                // MARK: Leaderboard Peek
                leaderboardPeek
            }
            .padding(.horizontal, SpacingToken.md)
            .padding(.bottom, SpacingToken.xxxl)
        }
        .background(ColorToken.navy.ignoresSafeArea())
        .navigationTitle(viewModel.event?.title ?? "Gameday")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showLeaderboard = true
                } label: {
                    Image(systemName: "trophy.fill")
                        .foregroundStyle(ColorToken.orange)
                }
            }
        }
        .sheet(item: $selectedActivation) { activation in
            activationDestination(for: activation)
        }
        .sheet(isPresented: $showLeaderboard) {
            NavigationStack {
                LeaderboardView(
                    eventID: viewModel.event?.id ?? "",
                    leaderboard: viewModel.leaderboard,
                    onRefresh: { await viewModel.loadLeaderboard() }
                )
            }
        }
        .task {
            await viewModel.onAppear()
        }
        .onDisappear {
            viewModel.onDisappear()
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .tint(ColorToken.orange)
                    .scaleEffect(1.4)
            }
        }
    }

    // MARK: - Event Header

    private var eventHeader: some View {
        VStack(spacing: SpacingToken.sm) {
            if let event = viewModel.event {
                if let imageURL = event.imageURL {
                    AsyncImage(url: imageURL) { image in
                        image
                            .resizable()
                            .aspectRatio(16 / 9, contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                            .fill(ColorToken.navyMid)
                            .aspectRatio(16 / 9, contentMode: .fill)
                            .shimmer()
                    }
                    .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous))
                }

                HStack {
                    VStack(alignment: .leading, spacing: SpacingToken.xs) {
                        Text(event.sport.rawValue.capitalized)
                            .font(TypographyToken.caption)
                            .foregroundStyle(ColorToken.mediumGray)
                            .textCase(.uppercase)

                        Text(event.title)
                            .font(TypographyToken.sectionHeader)
                            .foregroundStyle(.white)

                        Text("vs \(event.opponent)")
                            .font(TypographyToken.subtitle)
                            .foregroundStyle(ColorToken.mediumGray)
                    }

                    Spacer()

                    eventStatusBadge(event.status)
                }
                .padding(.horizontal, SpacingToken.xs)

                HStack(spacing: SpacingToken.sm) {
                    Label(event.startTime.formatted(date: .abbreviated, time: .shortened), systemImage: "calendar")
                    Spacer()
                }
                .font(TypographyToken.caption)
                .foregroundStyle(ColorToken.mediumGray)
                .padding(.horizontal, SpacingToken.xs)
            }
        }
    }

    // MARK: - Score Banner

    private var scoreBanner: some View {
        HStack {
            VStack(spacing: SpacingToken.xs) {
                Text("HOME")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                Text("\(viewModel.homeScore)")
                    .font(TypographyToken.pointsDisplay)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: SpacingToken.xs) {
                Text(viewModel.periodLabel.isEmpty ? "LIVE" : viewModel.periodLabel.uppercased())
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.orange)
                Circle()
                    .fill(ColorToken.error)
                    .frame(width: 8, height: 8)
                    .opacity(viewModel.phase == .live ? 1 : 0)
            }

            VStack(spacing: SpacingToken.xs) {
                Text("AWAY")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                Text("\(viewModel.awayScore)")
                    .font(TypographyToken.pointsDisplay)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
        .rallyCardShadow()
    }

    // MARK: - Check-In CTA

    private var checkInCTA: some View {
        NavigationLink {
            CheckInView(viewModel: viewModel)
        } label: {
            HStack(spacing: SpacingToken.smMd) {
                Image(systemName: "location.fill")
                    .font(.title3)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Check In Now")
                        .font(TypographyToken.buttonLabel)
                    Text("Verify your attendance and earn points")
                        .font(TypographyToken.caption)
                        .opacity(0.8)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .foregroundStyle(.white)
            .padding(SpacingToken.md)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.button, style: .continuous)
                    .fill(LinearGradient.rallyBrand)
            )
            .rallyElevatedShadow()
        }
    }

    // MARK: - Points Summary

    private var pointsSummary: some View {
        HStack {
            VStack(alignment: .leading, spacing: SpacingToken.xs) {
                Text("Gameday Points")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
                Text(viewModel.userPoints.pointsFormatted)
                    .font(TypographyToken.pointsDisplay)
                    .foregroundStyle(ColorToken.orange)
            }
            Spacer()
            Image(systemName: "checkmark.seal.fill")
                .font(.title2)
                .foregroundStyle(ColorToken.success)
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    // MARK: - Activations Section

    private var activationsSection: some View {
        VStack(alignment: .leading, spacing: SpacingToken.smMd) {
            Text("Activations")
                .font(TypographyToken.sectionHeader)
                .foregroundStyle(.white)

            ForEach(viewModel.activations) { activation in
                activationRow(activation)
            }
        }
    }

    private func activationRow(_ activation: Activation) -> some View {
        Button {
            selectedActivation = activation
        } label: {
            HStack(spacing: SpacingToken.smMd) {
                activationIcon(activation.type)
                    .frame(width: 40, height: 40)
                    .background(
                        RoundedRectangle(cornerRadius: RadiusToken.small, style: .continuous)
                            .fill(activationIconColor(activation.type).opacity(0.15))
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(activation.title)
                        .font(TypographyToken.cardTitle)
                        .foregroundStyle(.white)
                    Text("+\(activation.pointsValue) pts")
                        .font(TypographyToken.caption)
                        .foregroundStyle(ColorToken.orange)
                }

                Spacer()

                activationStatusBadge(activation.status)
            }
            .padding(SpacingToken.smMd)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                    .fill(ColorToken.navyMid)
            )
        }
        .disabled(activation.status != .active)
    }

    // MARK: - Leaderboard Peek

    private var leaderboardPeek: some View {
        VStack(alignment: .leading, spacing: SpacingToken.smMd) {
            HStack {
                Text("Leaderboard")
                    .font(TypographyToken.sectionHeader)
                    .foregroundStyle(.white)
                Spacer()
                Button("View All") { showLeaderboard = true }
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.accentBlue)
            }

            if let entries = viewModel.leaderboard?.entries.prefix(3) {
                ForEach(Array(entries)) { entry in
                    HStack(spacing: SpacingToken.smMd) {
                        Text("#\(entry.rank)")
                            .font(TypographyToken.buttonLabel)
                            .foregroundStyle(entry.rank <= 3 ? ColorToken.orange : .white)
                            .frame(width: 36)

                        Text(entry.displayName)
                            .font(TypographyToken.body)
                            .foregroundStyle(.white)
                            .lineLimit(1)

                        Spacer()

                        Text(entry.score.pointsFormatted)
                            .font(TypographyToken.caption)
                            .foregroundStyle(ColorToken.mediumGray)
                    }
                    .padding(.vertical, SpacingToken.xs)
                }
            } else {
                Text("Leaderboard loads once the event starts.")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
            }
        }
        .padding(SpacingToken.md)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous)
                .fill(ColorToken.navyMid)
        )
    }

    // MARK: - Helpers

    private func activationIcon(_ type: ActivationType) -> some View {
        Group {
            switch type {
            case .prediction:
                Image(systemName: "chart.bar.fill")
            case .trivia:
                Image(systemName: "brain.head.profile")
            case .noiseMeter:
                Image(systemName: "waveform")
            case .poll:
                Image(systemName: "chart.pie.fill")
            case .photoChallenge:
                Image(systemName: "camera.fill")
            case .checkIn:
                Image(systemName: "location.fill")
            case .survey:
                Image(systemName: "list.clipboard.fill")
            }
        }
        .font(.system(size: 18))
        .foregroundStyle(activationIconColor(type))
    }

    private func activationIconColor(_ type: ActivationType) -> Color {
        switch type {
        case .prediction:   return ColorToken.accentBlue
        case .trivia:       return ColorToken.warning
        case .noiseMeter:   return ColorToken.success
        case .poll:         return .purple
        case .photoChallenge: return .pink
        case .checkIn:      return ColorToken.orange
        case .survey:       return ColorToken.mediumGray
        }
    }

    private func eventStatusBadge(_ status: EventStatus) -> some View {
        Text(status.rawValue.capitalized)
            .font(TypographyToken.caption)
            .foregroundStyle(.white)
            .padding(.horizontal, SpacingToken.sm)
            .padding(.vertical, SpacingToken.xs)
            .background(
                Capsule()
                    .fill(status == .live ? ColorToken.error : ColorToken.mediumGray.opacity(0.3))
            )
    }

    private func activationStatusBadge(_ status: ActivationStatus) -> some View {
        Text(status.rawValue.capitalized)
            .font(TypographyToken.caption)
            .padding(.horizontal, SpacingToken.sm)
            .padding(.vertical, SpacingToken.xs)
            .foregroundStyle(status == .active ? .white : ColorToken.mediumGray)
            .background(
                Capsule()
                    .fill(status == .active ? ColorToken.success.opacity(0.8) : ColorToken.navyMid)
            )
    }

    @ViewBuilder
    private func activationDestination(for activation: Activation) -> some View {
        NavigationStack {
            switch activation.type {
            case .prediction:
                PredictionView(activation: activation, viewModel: viewModel)
            case .trivia:
                TriviaView(activation: activation, viewModel: viewModel)
            case .noiseMeter:
                NoiseMeterView(activation: activation, viewModel: viewModel)
            default:
                Text("Coming soon")
                    .font(TypographyToken.body)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(ColorToken.navy)
            }
        }
    }
}

// MARK: - Preview

#Preview("Gameday - Live") {
    NavigationStack {
        GamedayView(
            viewModel: .preview()
        )
    }
    .environment(ThemeEngine())
}

// MARK: - Preview Helpers

extension GamedayViewModel {
    /// Creates a preview-friendly view model with mock dependencies.
    @MainActor
    static func preview() -> GamedayViewModel {
        GamedayViewModel(
            eventID: "preview-event",
            eventRepository: PreviewEventRepository(),
            checkInRepository: PreviewCheckInRepository(),
            activationRepository: PreviewActivationRepository(),
            leaderboardRepository: PreviewLeaderboardRepository(),
            locationService: PreviewLocationService()
        )
    }
}

// MARK: - Preview Mocks

private struct PreviewEventRepository: EventRepositoryProtocol {
    func fetchEvents(schoolID: String) async throws -> [Event] { [Self.sampleEvent] }
    func fetchEvent(id: String) async throws -> Event { Self.sampleEvent }
    func fetchActivations(eventID: String) async throws -> [Activation] {
        Self.sampleEvent.activations
    }

    static let sampleEvent = Event(
        id: "evt-1",
        schoolID: "school-1",
        sport: .football,
        title: "Homecoming Game",
        opponent: "State Rivals",
        venueID: "venue-1",
        startTime: Date.now.addingTimeInterval(-3600),
        status: .live,
        activations: [
            Activation(
                id: "act-1", eventID: "evt-1", type: .prediction,
                title: "Who scores first?", pointsValue: 50, status: .active,
                payload: ActivationPayload(
                    question: "Which team scores first?",
                    options: [
                        ActivationOption(id: "opt-1", text: "Home Team"),
                        ActivationOption(id: "opt-2", text: "Away Team")
                    ]
                )
            ),
            Activation(
                id: "act-2", eventID: "evt-1", type: .trivia,
                title: "Mascot Trivia", pointsValue: 25, status: .active,
                payload: ActivationPayload(
                    question: "What year was the mascot introduced?",
                    options: [
                        ActivationOption(id: "opt-a", text: "1952"),
                        ActivationOption(id: "opt-b", text: "1967"),
                        ActivationOption(id: "opt-c", text: "1978"),
                        ActivationOption(id: "opt-d", text: "1983")
                    ],
                    correctOptionID: "opt-b",
                    timeLimit: 15
                )
            ),
            Activation(
                id: "act-3", eventID: "evt-1", type: .noiseMeter,
                title: "Halftime Noise Check", pointsValue: 30, status: .upcoming
            )
        ],
        homeScore: 14,
        awayScore: 7
    )
}

private struct PreviewCheckInRepository: CheckInRepositoryProtocol {
    func submitCheckIn(eventID: String, proof: CheckInProof) async throws -> CheckInResponse {
        CheckInResponse(
            checkIn: CheckIn(
                id: "ci-1", userID: "u-1", eventID: eventID, venueID: "v-1",
                proof: proof, pointsEarned: 100, status: .verified
            ),
            pointsEarned: 100, newBalance: 500, streakCount: 3
        )
    }
    func fetchCheckInHistory() async throws -> [CheckIn] { [] }
    func queueOfflineCheckIn(_ checkIn: CheckIn) async throws {}
    func syncPendingCheckIns() async throws {}
}

private struct PreviewActivationRepository: ActivationRepositoryProtocol {
    func submitAnswer(activationID: String, optionID: String) async throws -> SubmissionResult {
        SubmissionResult(isCorrect: true, pointsEarned: 50, newBalance: 550)
    }
    func submitNoiseMeter(activationID: String, decibelLevel: Double) async throws -> SubmissionResult {
        SubmissionResult(isCorrect: nil, pointsEarned: 30, newBalance: 580)
    }
    func submitPhoto(activationID: String, imageData: Data) async throws -> SubmissionResult {
        SubmissionResult(pointsEarned: 20, newBalance: 600)
    }
    func queueOfflineSubmission(activationID: String, payload: Data) async throws {}
}

private struct PreviewLeaderboardRepository: LeaderboardRepositoryProtocol {
    func fetchLeaderboard(eventID: String) async throws -> Leaderboard {
        Leaderboard(
            eventID: eventID,
            entries: [
                LeaderboardEntry(id: "le-1", userID: "u-1", displayName: "Fanatic42", score: 1250, rank: 1, tier: .mvp),
                LeaderboardEntry(id: "le-2", userID: "u-2", displayName: "GamedayGuru", score: 1100, rank: 2, tier: .allStar),
                LeaderboardEntry(id: "le-3", userID: "u-3", displayName: "SectionK_Rep", score: 980, rank: 3, tier: .allStar)
            ],
            currentUserRank: 15,
            totalParticipants: 482
        )
    }
}

private struct PreviewLocationService: LocationServiceProtocol {
    func requestPermission() async -> LocationPermissionStatus { .authorized }
    func startMonitoringVenue(_ venue: Venue) async {}
    func stopMonitoringVenue(_ venue: Venue) async {}
    func startBeaconRanging(uuid: String) async {}
    func stopBeaconRanging() async {}
    func currentLocation() async throws -> (latitude: Double, longitude: Double) {
        (latitude: 40.7128, longitude: -74.0060)
    }
}
