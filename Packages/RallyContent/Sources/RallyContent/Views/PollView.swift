import SwiftUI
import RallyCore
import RallyUI

/// Interactive poll component that allows fans to vote on a question, see
/// live results with animated progress bars, and earn engagement points.
public struct PollView: View {
    private let item: ContentItem
    private let options: [PollOption]
    private let onVote: ((String) async -> Void)?

    @State private var selectedOptionID: String?
    @State private var hasVoted = false
    @State private var isSubmitting = false
    @State private var animateResults = false

    public init(
        item: ContentItem,
        options: [PollOption],
        onVote: ((String) async -> Void)? = nil
    ) {
        self.item = item
        self.options = options
        self.onVote = onVote
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: SpacingToken.md) {
            header
            questionText
            optionsList
            footer
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

    // MARK: - Header

    private var header: some View {
        HStack {
            Image(systemName: "chart.bar.xaxis")
                .foregroundStyle(ColorToken.orange)
            Text("Poll")
                .font(TypographyToken.caption)
                .fontWeight(.semibold)
                .foregroundStyle(ColorToken.orange)
            Spacer()
            Text(item.publishedAt.relativeDescription)
                .font(TypographyToken.caption)
                .foregroundStyle(ColorToken.mediumGray)
        }
    }

    // MARK: - Question

    private var questionText: some View {
        Text(item.title)
            .font(TypographyToken.cardTitle)
            .foregroundStyle(ColorToken.navy)
    }

    // MARK: - Options List

    private var optionsList: some View {
        VStack(spacing: SpacingToken.sm) {
            ForEach(options) { option in
                if hasVoted {
                    resultRow(for: option)
                } else {
                    voteButton(for: option)
                }
            }
        }
    }

    // MARK: - Vote Button

    private func voteButton(for option: PollOption) -> some View {
        Button {
            guard !isSubmitting else { return }
            selectedOptionID = option.id
            Task {
                await submitVote(optionID: option.id)
            }
        } label: {
            HStack {
                Text(option.text)
                    .font(TypographyToken.body)
                    .foregroundStyle(
                        selectedOptionID == option.id ? ColorToken.orange : ColorToken.navy
                    )
                Spacer()
                if isSubmitting && selectedOptionID == option.id {
                    ProgressView()
                        .controlSize(.small)
                }
            }
            .padding(.horizontal, SpacingToken.md)
            .padding(.vertical, SpacingToken.smMd)
            .background(
                RoundedRectangle(cornerRadius: RadiusToken.button)
                    .stroke(
                        selectedOptionID == option.id ? ColorToken.orange : ColorToken.mediumGray.opacity(0.3),
                        lineWidth: selectedOptionID == option.id ? 2 : 1
                    )
            )
        }
        .disabled(isSubmitting)
    }

    // MARK: - Result Row

    private func resultRow(for option: PollOption) -> some View {
        let percentage = totalVotes > 0 ? Double(option.voteCount) / Double(totalVotes) : 0
        let isSelected = selectedOptionID == option.id
        let isWinning = option.voteCount == options.map(\.voteCount).max()

        return VStack(alignment: .leading, spacing: SpacingToken.xs) {
            HStack {
                Text(option.text)
                    .font(TypographyToken.body)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(ColorToken.navy)

                Spacer()

                Text("\(Int(percentage * 100))%")
                    .font(TypographyToken.subtitle)
                    .fontWeight(.bold)
                    .foregroundStyle(isWinning ? ColorToken.orange : ColorToken.mediumGray)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ColorToken.orange)
                        .font(.caption)
                }
            }

            // Animated progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: RadiusToken.small)
                        .fill(ColorToken.offWhite)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: RadiusToken.small)
                        .fill(isWinning ? ColorToken.orange : ColorToken.accentBlue.opacity(0.6))
                        .frame(
                            width: animateResults ? geometry.size.width * percentage : 0,
                            height: 8
                        )
                }
            }
            .frame(height: 8)
        }
        .padding(.horizontal, SpacingToken.md)
        .padding(.vertical, SpacingToken.smMd)
        .background(
            RoundedRectangle(cornerRadius: RadiusToken.button)
                .fill(isSelected ? ColorToken.orange.opacity(0.05) : Color.clear)
                .stroke(
                    isSelected ? ColorToken.orange.opacity(0.2) : Color.clear,
                    lineWidth: 1
                )
        )
    }

    // MARK: - Footer

    private var footer: some View {
        HStack {
            if hasVoted {
                Text("\(totalVotes.abbreviated) votes")
                    .font(TypographyToken.caption)
                    .foregroundStyle(ColorToken.mediumGray)
            }
            Spacer()
            if let points = item.engagementData?.pointsValue, points > 0, !hasVoted {
                Label("+\(points) pts", systemImage: "star.fill")
                    .font(TypographyToken.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(ColorToken.orange)
            }
        }
    }

    // MARK: - Computed

    private var totalVotes: Int {
        options.reduce(0) { $0 + $1.voteCount }
    }

    // MARK: - Actions

    private func submitVote(optionID: String) async {
        isSubmitting = true
        await onVote?(optionID)
        isSubmitting = false

        withAnimation(.easeInOut(duration: 0.3)) {
            hasVoted = true
        }

        // Delay the bar animation slightly for a staggered effect.
        try? await Task.sleep(for: .milliseconds(150))

        withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
            animateResults = true
        }
    }
}

// MARK: - Poll Option Model

/// Represents a single option in a fan poll.
public struct PollOption: Identifiable, Sendable {
    public let id: String
    public let text: String
    public let voteCount: Int

    public init(id: String, text: String, voteCount: Int = 0) {
        self.id = id
        self.text = text
        self.voteCount = voteCount
    }
}

// MARK: - Preview

#Preview("Poll - Voting") {
    ScrollView {
        PollView(
            item: ContentItem(
                id: "poll-1",
                schoolID: "school-001",
                type: .poll,
                title: "Who will be this season's MVP?",
                publishedAt: Date.now.addingTimeInterval(-3_600),
                engagementData: ContentEngagement(likes: 87, comments: 23, shares: 5, pointsValue: 5)
            ),
            options: [
                PollOption(id: "opt-1", text: "Marcus Johnson (#7)", voteCount: 342),
                PollOption(id: "opt-2", text: "Tyler Brooks (#12)", voteCount: 289),
                PollOption(id: "opt-3", text: "DeShawn Williams (#3)", voteCount: 198),
                PollOption(id: "opt-4", text: "Chris Martinez (#21)", voteCount: 156)
            ]
        ) { optionID in
            try? await Task.sleep(for: .seconds(1))
        }
        .padding()
    }
}

#Preview("Poll - Multiple") {
    ScrollView {
        VStack(spacing: 16) {
            PollView(
                item: ContentItem(
                    id: "poll-2",
                    schoolID: "school-001",
                    type: .poll,
                    title: "Predict the final score margin",
                    publishedAt: Date.now.addingTimeInterval(-7_200),
                    engagementData: ContentEngagement(pointsValue: 10)
                ),
                options: [
                    PollOption(id: "a", text: "Win by 1-7", voteCount: 120),
                    PollOption(id: "b", text: "Win by 8-14", voteCount: 245),
                    PollOption(id: "c", text: "Win by 15+", voteCount: 189),
                    PollOption(id: "d", text: "Loss", voteCount: 42)
                ]
            )
        }
        .padding()
    }
}
