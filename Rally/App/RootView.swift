import SwiftUI
import RallyCore

/// Root view that switches between auth, onboarding, and main app flows.
struct RootView: View {
    @Environment(AppContainer.self) private var container
    @Environment(ThemeEngine.self) private var themeEngine

    var body: some View {
        Group {
            switch container.authState {
            case .unknown:
                LaunchScreen()
                    .task {
                        await container.bootstrap()
                    }

            case .unauthenticated:
                SignInContainerView()

            case .onboarding:
                OnboardingContainerView()

            case .authenticated:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authStateKey)
    }

    private var authStateKey: String {
        switch container.authState {
        case .unknown: return "unknown"
        case .unauthenticated: return "unauth"
        case .onboarding: return "onboarding"
        case .authenticated: return "auth"
        }
    }
}

/// Launch screen shown during bootstrap.
struct LaunchScreen: View {
    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            VStack(spacing: RallySpacing.md) {
                Image(systemName: "megaphone.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(RallyColors.orange)
                    .symbolEffect(.pulse)

                Text("Rally")
                    .font(RallyTypography.heroTitle)
                    .foregroundStyle(.white)

                ProgressView()
                    .tint(RallyColors.orange)
                    .padding(.top, RallySpacing.lg)
            }
        }
    }
}

/// Placeholder for sign-in flow (implemented in RallyAuth package).
struct SignInContainerView: View {
    @Environment(AppContainer.self) private var container

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            VStack(spacing: RallySpacing.xl) {
                Spacer()

                Image(systemName: "megaphone.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(RallyColors.orange)

                VStack(spacing: RallySpacing.sm) {
                    Text("Rally")
                        .font(RallyTypography.heroTitle)
                        .foregroundStyle(.white)

                    Text("Your Game. Your Rewards.")
                        .font(RallyTypography.subtitle)
                        .foregroundStyle(RallyColors.gray)
                }

                Spacer()

                VStack(spacing: RallySpacing.md) {
                    SignInWithAppleButton()

                    Button {
                        container.beginOnboarding()
                    } label: {
                        Text("Continue with Email")
                            .font(RallyTypography.buttonLabel)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, RallySpacing.smMd)
                    }
                    .buttonStyle(.bordered)
                    .tint(.white)
                }
                .padding(.horizontal, RallySpacing.xl)
                .padding(.bottom, RallySpacing.xxl)
            }
        }
    }
}

/// Placeholder Sign in with Apple button.
struct SignInWithAppleButton: View {
    var body: some View {
        Button {
            // Sign in with Apple flow handled by RallyAuth
        } label: {
            HStack(spacing: RallySpacing.sm) {
                Image(systemName: "apple.logo")
                    .font(.title3)
                Text("Sign in with Apple")
                    .font(RallyTypography.buttonLabel)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, RallySpacing.smMd)
            .foregroundStyle(.black)
            .background(.white, in: RoundedRectangle(cornerRadius: RallyRadius.button))
        }
    }
}

/// Placeholder for onboarding flow (implemented in RallyAuth package).
struct OnboardingContainerView: View {
    @Environment(AppContainer.self) private var container
    @Environment(ThemeEngine.self) private var themeEngine

    var body: some View {
        NavigationStack {
            SchoolPickerView()
        }
    }
}

/// School selection during onboarding.
struct SchoolPickerView: View {
    @Environment(AppContainer.self) private var container
    @Environment(ThemeEngine.self) private var themeEngine
    @State private var searchText = ""
    @State private var schools: [School] = School.samples

    private var filteredSchools: [School] {
        if searchText.isEmpty { return schools }
        return schools.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.mascot.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            VStack(spacing: RallySpacing.lg) {
                Text("Choose Your School")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)

                Text("Select the school you want to rally behind")
                    .font(RallyTypography.subtitle)
                    .foregroundStyle(RallyColors.gray)

                ScrollView {
                    LazyVStack(spacing: RallySpacing.sm) {
                        ForEach(filteredSchools) { school in
                            SchoolRow(school: school) {
                                container.didSelectSchool(school)
                                themeEngine.applySchool(school)
                                container.completeOnboarding(
                                    user: UserProfile(
                                        id: UUID().uuidString,
                                        displayName: "Fan",
                                        schoolID: school.id
                                    )
                                )
                            }
                        }
                    }
                    .padding(.horizontal, RallySpacing.md)
                }
            }
            .padding(.top, RallySpacing.lg)
        }
        .searchable(text: $searchText, prompt: "Search schools")
    }
}

/// Row for school selection.
struct SchoolRow: View {
    let school: School
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: RallySpacing.md) {
                Circle()
                    .fill(Color(hex: school.theme.primaryColor) ?? RallyColors.orange)
                    .frame(width: 48, height: 48)
                    .overlay {
                        Text(school.abbreviation.prefix(2))
                            .font(RallyTypography.buttonLabel)
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(school.name)
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(.white)
                    Text(school.mascot)
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(RallyColors.gray)
            }
            .padding(RallySpacing.md)
            .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
        }
        .accessibilityLabel("Select \(school.name) \(school.mascot)")
    }
}

#Preview("Root - Launch") {
    RootView()
        .environment(AppContainer())
        .environment(ThemeEngine())
}

#Preview("Root - Sign In") {
    SignInContainerView()
        .environment(AppContainer())
}
