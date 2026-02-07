import SwiftUI
import RallyCore

/// A branded sponsor banner component that displays the sponsor's logo,
/// name, and an optional call-to-action. Automatically tracks viewability
/// impressions when the banner becomes visible on screen.
public struct SponsorBannerView: View {
    private let sponsor: Sponsor
    private let placement: String
    private let activationID: String?
    private let eventID: String?
    private let style: BannerStyle
    private let onTap: (() -> Void)?

    @State private var appearTime: Date?
    @State private var hasTrackedImpression = false

    /// Visual style variants for the sponsor banner.
    public enum BannerStyle: Sendable {
        /// Full-width banner with logo, name, and CTA — used in feed and detail views.
        case standard
        /// Compact horizontal strip — used inside activation cards.
        case compact
        /// Prominent branded header — used for presenting sponsors.
        case featured
    }

    public init(
        sponsor: Sponsor,
        placement: String,
        activationID: String? = nil,
        eventID: String? = nil,
        style: BannerStyle = .standard,
        onTap: (() -> Void)? = nil
    ) {
        self.sponsor = sponsor
        self.placement = placement
        self.activationID = activationID
        self.eventID = eventID
        self.style = style
        self.onTap = onTap
    }

    public var body: some View {
        Group {
            switch style {
            case .standard:
                standardBanner
            case .compact:
                compactBanner
            case .featured:
                featuredBanner
            }
        }
        .onAppear {
            appearTime = .now
        }
        .onDisappear {
            hasTrackedImpression = false
            appearTime = nil
        }
        .onTapGesture {
            onTap?()
        }
    }

    // MARK: - Standard Banner

    private var standardBanner: some View {
        HStack(spacing: RallySpacing.smMd) {
            sponsorLogo(size: 40)

            VStack(alignment: .leading, spacing: RallySpacing.xs) {
                Text("Presented by")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                Text(sponsor.name)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(RallyColors.navy)
            }

            Spacer()

            if sponsor.websiteURL != nil {
                Image(systemName: "arrow.up.right.square")
                    .font(.body)
                    .foregroundStyle(RallyColors.blue)
            }
        }
        .padding(RallySpacing.md)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: RallyRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: RallyRadius.card)
                .stroke(RallyColors.gray.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Compact Banner

    private var compactBanner: some View {
        HStack(spacing: RallySpacing.sm) {
            sponsorLogo(size: 24)

            Text("Sponsored by \(sponsor.name)")
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)

            Spacer()
        }
        .padding(.horizontal, RallySpacing.smMd)
        .padding(.vertical, RallySpacing.sm)
        .background(RallyColors.offWhite)
        .clipShape(RoundedRectangle(cornerRadius: RallyRadius.small))
    }

    // MARK: - Featured Banner

    private var featuredBanner: some View {
        VStack(spacing: RallySpacing.smMd) {
            sponsorLogo(size: 56)

            Text(sponsor.name)
                .font(RallyTypography.sectionHeader)
                .foregroundStyle(.white)

            Text("Presenting Sponsor")
                .font(RallyTypography.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.7))
                .tracking(1.2)
                .textCase(.uppercase)

            if sponsor.websiteURL != nil {
                HStack(spacing: RallySpacing.xs) {
                    Text("Learn More")
                        .font(RallyTypography.buttonLabel)
                        .foregroundStyle(RallyColors.orange)
                    Image(systemName: "arrow.right")
                        .font(.caption)
                        .foregroundStyle(RallyColors.orange)
                }
                .padding(.top, RallySpacing.xs)
            }
        }
        .padding(.vertical, RallySpacing.lg)
        .padding(.horizontal, RallySpacing.md)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [RallyColors.navy, RallyColors.navyMid],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: RallyRadius.card))
    }

    // MARK: - Sponsor Logo

    private func sponsorLogo(size: CGFloat) -> some View {
        Group {
            if let logoURL = sponsor.logoURL {
                AsyncImage(url: logoURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    case .failure:
                        logoPlaceholder(size: size)
                    case .empty:
                        logoPlaceholder(size: size)
                            .overlay(ProgressView().controlSize(.mini))
                    @unknown default:
                        logoPlaceholder(size: size)
                    }
                }
            } else {
                logoPlaceholder(size: size)
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.2))
    }

    private func logoPlaceholder(size: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: size * 0.2)
            .fill(RallyColors.offWhite)
            .overlay(
                Text(String(sponsor.name.prefix(1)).uppercased())
                    .font(.system(size: size * 0.4, weight: .bold))
                    .foregroundStyle(RallyColors.gray)
            )
    }

    // MARK: - Viewability Duration

    /// The elapsed time since the banner appeared, or `nil` if not visible.
    public var viewDuration: TimeInterval? {
        guard let appearTime else { return nil }
        return Date.now.timeIntervalSince(appearTime)
    }
}

// MARK: - Preview

#Preview("Sponsor Banner - Standard") {
    VStack(spacing: 16) {
        SponsorBannerView(
            sponsor: Sponsor(
                id: "sp-1",
                name: "Gatorade",
                logoURL: URL(string: "https://placehold.co/80x80"),
                websiteURL: URL(string: "https://gatorade.com"),
                tier: .presenting
            ),
            placement: "feed_card"
        )

        SponsorBannerView(
            sponsor: Sponsor(
                id: "sp-2",
                name: "Nike",
                logoURL: URL(string: "https://placehold.co/80x80"),
                tier: .premium
            ),
            placement: "feed_card"
        )
    }
    .padding()
}

#Preview("Sponsor Banner - Compact") {
    VStack(spacing: 12) {
        SponsorBannerView(
            sponsor: Sponsor(
                id: "sp-1",
                name: "Gatorade",
                tier: .presenting
            ),
            placement: "activation_card",
            style: .compact
        )

        SponsorBannerView(
            sponsor: Sponsor(
                id: "sp-3",
                name: "Campus Bookstore",
                tier: .standard
            ),
            placement: "activation_card",
            style: .compact
        )
    }
    .padding()
}

#Preview("Sponsor Banner - Featured") {
    SponsorBannerView(
        sponsor: Sponsor(
            id: "sp-1",
            name: "Gatorade",
            logoURL: URL(string: "https://placehold.co/120x120"),
            websiteURL: URL(string: "https://gatorade.com"),
            tier: .presenting
        ),
        placement: "gameday_header",
        style: .featured
    )
    .padding()
}
