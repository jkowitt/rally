import RallyCore
import SwiftUI

// MARK: - SchoolSelectorView

/// A searchable school selection view that displays school logos,
/// names, and mascots. When a school is selected, the view applies
/// the school's theme via ``ThemeEngine`` for dynamic branding
/// throughout the app.
public struct SchoolSelectorView: View {

    // MARK: - Properties

    @Binding private var selectedSchool: School?
    private let onSelect: (School) -> Void

    @Environment(ThemeEngine.self) private var themeEngine
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""
    @State private var schools: [School] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var confirmedSchool: School?

    // MARK: - Initialization

    /// Creates a new SchoolSelectorView.
    /// - Parameters:
    ///   - selectedSchool: Binding to the currently selected school.
    ///   - onSelect: Callback invoked when a school is confirmed.
    public init(
        selectedSchool: Binding<School?>,
        onSelect: @escaping (School) -> Void
    ) {
        self._selectedSchool = selectedSchool
        self.onSelect = onSelect
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            ZStack {
                RallyColors.navy
                    .ignoresSafeArea()

                content
            }
            .navigationTitle("Select School")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(RallyColors.gray)
                }

                if confirmedSchool != nil {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            if let school = confirmedSchool {
                                applySchoolTheme(school)
                                selectedSchool = school
                                onSelect(school)
                            }
                        }
                        .foregroundStyle(RallyColors.orange)
                        .fontWeight(.semibold)
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search schools...")
            .toolbarBackground(RallyColors.navy, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .task {
            await loadSchools()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if isLoading {
            loadingView
        } else if let error = errorMessage {
            errorView(error)
        } else if filteredSchools.isEmpty {
            emptyStateView
        } else {
            schoolList
        }
    }

    // MARK: - School List

    private var schoolList: some View {
        ScrollView {
            LazyVStack(spacing: RallySpacing.sm) {
                ForEach(filteredSchools) { school in
                    schoolRow(school)
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                confirmedSchool = school
                            }
                        }
                }
            }
            .padding(.horizontal, RallySpacing.md)
            .padding(.vertical, RallySpacing.sm)
        }
    }

    private func schoolRow(_ school: School) -> some View {
        let isSelected = confirmedSchool?.id == school.id
        let primaryColor = Color(hex: school.theme.primaryColor) ?? RallyColors.orange

        return HStack(spacing: RallySpacing.md) {
            // School logo
            schoolLogo(school: school, primaryColor: primaryColor)

            // School info
            VStack(alignment: .leading, spacing: RallySpacing.xs) {
                Text(school.name)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Text(school.mascot)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
                    .lineLimit(1)

                // Conference / abbreviation tag
                Text(school.abbreviation)
                    .font(RallyTypography.caption)
                    .foregroundStyle(primaryColor)
                    .padding(.horizontal, RallySpacing.sm)
                    .padding(.vertical, RallySpacing.xs)
                    .background(
                        Capsule()
                            .fill(primaryColor.opacity(0.15))
                    )
            }

            Spacer()

            // Selection indicator
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(primaryColor)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(RallySpacing.smMd)
        .background(
            RoundedRectangle(cornerRadius: RallyRadius.card)
                .fill(isSelected ? primaryColor.opacity(0.1) : RallyColors.navyMid)
                .overlay(
                    RoundedRectangle(cornerRadius: RallyRadius.card)
                        .stroke(
                            isSelected ? primaryColor.opacity(0.4) : Color.clear,
                            lineWidth: 1.5
                        )
                )
        )
        .contentShape(Rectangle())
        .accessibilityLabel("\(school.name) \(school.mascot)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func schoolLogo(school: School, primaryColor: Color) -> some View {
        AsyncImage(url: school.logoURL) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)

            case .failure:
                schoolInitialsPlaceholder(school: school, primaryColor: primaryColor)

            case .empty:
                ProgressView()
                    .tint(RallyColors.gray)

            @unknown default:
                schoolInitialsPlaceholder(school: school, primaryColor: primaryColor)
            }
        }
        .frame(width: 56, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: RallyRadius.small))
        .background(
            RoundedRectangle(cornerRadius: RallyRadius.small)
                .fill(primaryColor.opacity(0.1))
        )
    }

    private func schoolInitialsPlaceholder(school: School, primaryColor: Color) -> some View {
        Text(school.abbreviation.prefix(3))
            .font(RallyTypography.buttonLabel)
            .foregroundStyle(primaryColor)
            .frame(width: 56, height: 56)
            .background(
                RoundedRectangle(cornerRadius: RallyRadius.small)
                    .fill(primaryColor.opacity(0.15))
            )
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: RallySpacing.md) {
            ProgressView()
                .tint(RallyColors.orange)
                .scaleEffect(1.2)
            Text("Loading schools...")
                .font(RallyTypography.body)
                .foregroundStyle(RallyColors.gray)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: RallySpacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundStyle(RallyColors.warning)

            Text("Something went wrong")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)

            Text(message)
                .font(RallyTypography.body)
                .foregroundStyle(RallyColors.gray)
                .multilineTextAlignment(.center)

            Button {
                Task { await loadSchools() }
            } label: {
                Text("Try Again")
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(.white)
                    .padding(.horizontal, RallySpacing.xl)
                    .padding(.vertical, RallySpacing.smMd)
                    .background(
                        RoundedRectangle(cornerRadius: RallyRadius.button)
                            .fill(RallyColors.orange)
                    )
            }
        }
        .padding(RallySpacing.xl)
    }

    private var emptyStateView: some View {
        VStack(spacing: RallySpacing.md) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(RallyColors.gray)

            if searchText.isEmpty {
                Text("No schools available")
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)

                Text("Check back soon as we add more partner schools.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
            } else {
                Text("No results for \"\(searchText)\"")
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)

                Text("Try a different search term or browse all schools.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(RallySpacing.xl)
    }

    // MARK: - Filtering

    private var filteredSchools: [School] {
        guard !searchText.isEmpty else {
            return schools
        }

        let query = searchText.lowercased()
        return schools.filter { school in
            school.name.lowercased().contains(query) ||
            school.mascot.lowercased().contains(query) ||
            school.abbreviation.lowercased().contains(query)
        }
    }

    // MARK: - Data Loading

    private func loadSchools() async {
        isLoading = true
        errorMessage = nil

        // Simulated data for development.
        // In production this calls SchoolRepositoryProtocol.fetchSchools().
        let sampleSchools: [School] = [
            School(
                id: "ou",
                name: "University of Oklahoma",
                mascot: "Sooners",
                abbreviation: "OU",
                theme: SchoolTheme(
                    primaryColor: "#841617",
                    secondaryColor: "#FDF4DC",
                    accentColor: "#E31937"
                )
            ),
            School(
                id: "osu",
                name: "Oklahoma State University",
                mascot: "Cowboys",
                abbreviation: "OSU",
                theme: SchoolTheme(
                    primaryColor: "#FF6600",
                    secondaryColor: "#000000",
                    accentColor: "#FF8533"
                )
            ),
            School(
                id: "ut",
                name: "University of Texas",
                mascot: "Longhorns",
                abbreviation: "UT",
                theme: SchoolTheme(
                    primaryColor: "#BF5700",
                    secondaryColor: "#FFFFFF",
                    accentColor: "#CC7722"
                )
            ),
            School(
                id: "tamu",
                name: "Texas A&M University",
                mascot: "Aggies",
                abbreviation: "TAMU",
                theme: SchoolTheme(
                    primaryColor: "#500000",
                    secondaryColor: "#FFFFFF",
                    accentColor: "#732F2F"
                )
            ),
            School(
                id: "ku",
                name: "University of Kansas",
                mascot: "Jayhawks",
                abbreviation: "KU",
                theme: SchoolTheme(
                    primaryColor: "#0051BA",
                    secondaryColor: "#E8000D",
                    accentColor: "#FFC82D"
                )
            ),
        ]

        // Simulate network delay.
        try? await Task.sleep(for: .milliseconds(500))

        schools = sampleSchools
        isLoading = false
    }

    // MARK: - Theme Application

    private func applySchoolTheme(_ school: School) {
        themeEngine.applySchool(school)
    }
}

// MARK: - Preview

#Preview("School Selector") {
    SchoolSelectorView(
        selectedSchool: .constant(nil),
        onSelect: { school in
            print("Selected: \(school.name)")
        }
    )
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}

#Preview("School Selector - Pre-selected") {
    SchoolSelectorView(
        selectedSchool: .constant(
            School(
                id: "ou",
                name: "University of Oklahoma",
                mascot: "Sooners",
                abbreviation: "OU",
                theme: SchoolTheme(
                    primaryColor: "#841617",
                    secondaryColor: "#FDF4DC",
                    accentColor: "#E31937"
                )
            )
        ),
        onSelect: { school in
            print("Selected: \(school.name)")
        }
    )
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}
