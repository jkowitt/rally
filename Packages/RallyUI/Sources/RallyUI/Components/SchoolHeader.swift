import SwiftUI
import RallyCore

/// School branding banner displaying the logo, school name, and mascot, themed
/// with the school's primary colors.
///
/// Usage:
/// ```swift
/// SchoolHeader(school: school)
/// ```
public struct SchoolHeader: View {

    // MARK: - Style

    /// Layout variants for the header.
    public enum Style {
        /// Full-width banner with large logo and mascot image.
        case banner
        /// Compact inline display for navigation bars or list headers.
        case compact
    }

    // MARK: - Properties

    @Environment(ThemeEngine.self) private var themeEngine

    private let school: School
    private let style: Style

    // MARK: - Init

    /// Creates a school header.
    /// - Parameters:
    ///   - school: The school to display branding for.
    ///   - style: Layout variant (default `.banner`).
    public init(school: School, style: Style = .banner) {
        self.school = school
        self.style = style
    }

    // MARK: - Body

    public var body: some View {
        switch style {
        case .banner:
            bannerLayout
        case .compact:
            compactLayout
        }
    }

    // MARK: - Banner Layout

    private var bannerLayout: some View {
        ZStack(alignment: .bottomLeading) {
            // Background gradient from school colors
            LinearGradient(
                colors: [
                    themeEngine.activeTheme.primaryColor,
                    themeEngine.activeTheme.secondaryColor
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 180)
            .overlay(alignment: .trailing) {
                // Mascot image (decorative, faded)
                mascotImage
                    .opacity(0.2)
                    .frame(maxHeight: 160)
                    .clipped()
            }

            // Logo + school name overlay
            HStack(spacing: RallySpacing.smMd) {
                schoolLogo(size: 56)

                VStack(alignment: .leading, spacing: RallySpacing.xs) {
                    Text(school.name)
                        .font(RallyTypography.sectionHeader)
                        .foregroundStyle(.white)
                        .lineLimit(2)

                    Text(school.mascot)
                        .font(RallyTypography.subtitle)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding(RallySpacing.md)
        }
        .clipShape(RoundedRectangle(cornerRadius: RadiusToken.card, style: .continuous))
        .rallyCardShadow()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(school.name) \(school.mascot)")
    }

    // MARK: - Compact Layout

    private var compactLayout: some View {
        HStack(spacing: RallySpacing.sm) {
            schoolLogo(size: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(school.name)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(school.mascot)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                    .lineLimit(1)
            }

            Spacer()

            // School abbreviation badge
            Text(school.abbreviation)
                .font(RallyTypography.caption)
                .fontWeight(.bold)
                .foregroundStyle(themeEngine.activeTheme.primaryColor)
                .padding(.horizontal, RallySpacing.sm)
                .padding(.vertical, RallySpacing.xs)
                .background(
                    Capsule()
                        .fill(themeEngine.activeTheme.primaryColor.opacity(0.15))
                )
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(school.name) \(school.mascot)")
    }

    // MARK: - Subviews

    @ViewBuilder
    private func schoolLogo(size: CGFloat) -> some View {
        if let logoURL = school.logoURL {
            AsyncImage(url: logoURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                case .failure:
                    logoPlaceholder(size: size)
                case .empty:
                    ProgressView()
                        .frame(width: size, height: size)
                @unknown default:
                    logoPlaceholder(size: size)
                }
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            logoPlaceholder(size: size)
        }
    }

    private func logoPlaceholder(size: CGFloat) -> some View {
        Circle()
            .fill(themeEngine.activeTheme.primaryColor.opacity(0.3))
            .frame(width: size, height: size)
            .overlay(
                Text(school.abbreviation.prefix(2))
                    .font(size > 40 ? RallyTypography.cardTitle : RallyTypography.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            )
    }

    @ViewBuilder
    private var mascotImage: some View {
        if let mascotURL = school.mascotImageURL {
            AsyncImage(url: mascotURL) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("School Header") {
    let school = School(
        id: "demo-school",
        name: "State University",
        mascot: "Wildcats",
        abbreviation: "STU",
        theme: SchoolTheme(
            primaryColor: "#FF6B35",
            secondaryColor: "#131B2E",
            accentColor: "#2D9CDB"
        )
    )

    VStack(spacing: 24) {
        SchoolHeader(school: school, style: .banner)
        SchoolHeader(school: school, style: .compact)
            .padding(.horizontal)
    }
    .padding()
    .background(RallyColors.navy)
    .environment(ThemeEngine())
}
