import CoreLocationUI
import RallyCore
import SwiftUI
import UserNotifications

// MARK: - OnboardingView

/// First-launch onboarding flow that walks users through:
/// 1. Welcome screen with Rally branding
/// 2. School selection
/// 3. Notification permission request
/// 4. Location permission request
///
/// Each step is presented as a full-screen page with consistent styling
/// and forward/back navigation.
public struct OnboardingView: View {

    // MARK: - Properties

    @Bindable private var viewModel: AuthViewModel
    @Environment(ThemeEngine.self) private var themeEngine

    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var showSchoolSelector = false

    // MARK: - Initialization

    public init(viewModel: AuthViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            backgroundGradient
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress indicator
                progressBar
                    .padding(.horizontal, RallySpacing.lg)
                    .padding(.top, RallySpacing.md)

                // Step content
                TabView(selection: $viewModel.onboardingStep) {
                    welcomeStep
                        .tag(OnboardingStep.welcome)

                    schoolSelectionStep
                        .tag(OnboardingStep.schoolSelection)

                    notificationPermissionStep
                        .tag(OnboardingStep.notificationPermission)

                    locationPermissionStep
                        .tag(OnboardingStep.locationPermission)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: viewModel.onboardingStep)
            }
        }
        .sheet(isPresented: $showSchoolSelector) {
            SchoolSelectorView(
                selectedSchool: $viewModel.selectedSchool,
                onSelect: { _ in
                    showSchoolSelector = false
                    viewModel.advanceOnboarding()
                }
            )
            .environment(themeEngine)
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        HStack(spacing: RallySpacing.xs) {
            ForEach(OnboardingStep.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(step <= viewModel.onboardingStep ? RallyColors.orange : RallyColors.gray.opacity(0.3))
                    .frame(height: 4)
                    .animation(.easeInOut(duration: 0.3), value: viewModel.onboardingStep)
            }
        }
    }

    // MARK: - Step 1: Welcome

    private var welcomeStep: some View {
        VStack(spacing: RallySpacing.xl) {
            Spacer()

            // Rally branding
            VStack(spacing: RallySpacing.lg) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 80, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [RallyColors.orange, RallyColors.warning],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Welcome to Rally")
                    .font(RallyTypography.heroTitle)
                    .foregroundStyle(.white)

                Text("The ultimate gameday companion for college sports fans. Earn points, unlock rewards, and rally with your school.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, RallySpacing.lg)
            }

            Spacer()

            // Feature highlights
            VStack(spacing: RallySpacing.md) {
                featureRow(
                    icon: "mappin.circle.fill",
                    title: "Check In",
                    subtitle: "Earn points at every game"
                )
                featureRow(
                    icon: "trophy.fill",
                    title: "Compete",
                    subtitle: "Climb the leaderboard"
                )
                featureRow(
                    icon: "gift.fill",
                    title: "Redeem",
                    subtitle: "Unlock exclusive rewards"
                )
            }
            .padding(.horizontal, RallySpacing.lg)

            Spacer()

            // Continue button
            primaryButton(title: "Get Started") {
                viewModel.advanceOnboarding()
            }
            .padding(.horizontal, RallySpacing.lg)
            .padding(.bottom, RallySpacing.xl)
        }
    }

    // MARK: - Step 2: School Selection

    private var schoolSelectionStep: some View {
        VStack(spacing: RallySpacing.xl) {
            Spacer()

            VStack(spacing: RallySpacing.md) {
                Image(systemName: "building.columns.fill")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(RallyColors.blue)

                Text("Choose Your School")
                    .font(RallyTypography.heroTitle)
                    .foregroundStyle(.white)

                Text("Select your school to see events, earn points, and connect with fellow fans.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, RallySpacing.lg)
            }

            Spacer()

            if let school = viewModel.selectedSchool {
                // Show selected school
                selectedSchoolCard(school)
                    .padding(.horizontal, RallySpacing.lg)

                Button("Change School") {
                    showSchoolSelector = true
                }
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(RallyColors.blue)
            }

            Spacer()

            VStack(spacing: RallySpacing.md) {
                primaryButton(title: viewModel.selectedSchool != nil ? "Continue" : "Select School") {
                    if viewModel.selectedSchool != nil {
                        viewModel.advanceOnboarding()
                    } else {
                        showSchoolSelector = true
                    }
                }

                // Skip option
                Button("Skip for Now") {
                    viewModel.advanceOnboarding()
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            }
            .padding(.horizontal, RallySpacing.lg)
            .padding(.bottom, RallySpacing.xl)
        }
    }

    // MARK: - Step 3: Notification Permission

    private var notificationPermissionStep: some View {
        VStack(spacing: RallySpacing.xl) {
            Spacer()

            VStack(spacing: RallySpacing.md) {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(RallyColors.orange)

                Text("Stay in the Loop")
                    .font(RallyTypography.heroTitle)
                    .foregroundStyle(.white)

                Text("Get notified about upcoming games, live activations, and when your rewards are ready.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, RallySpacing.lg)
            }

            Spacer()

            // Benefits list
            VStack(spacing: RallySpacing.smMd) {
                permissionBenefit(
                    icon: "calendar.badge.clock",
                    text: "Gameday reminders before kickoff"
                )
                permissionBenefit(
                    icon: "bolt.fill",
                    text: "Live activation alerts during games"
                )
                permissionBenefit(
                    icon: "gift.fill",
                    text: "Reward availability notifications"
                )
            }
            .padding(.horizontal, RallySpacing.lg)

            Spacer()

            VStack(spacing: RallySpacing.md) {
                primaryButton(title: "Enable Notifications") {
                    await requestNotificationPermission()
                }

                Button("Not Now") {
                    viewModel.advanceOnboarding()
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            }
            .padding(.horizontal, RallySpacing.lg)
            .padding(.bottom, RallySpacing.xl)
        }
    }

    // MARK: - Step 4: Location Permission

    private var locationPermissionStep: some View {
        VStack(spacing: RallySpacing.xl) {
            Spacer()

            VStack(spacing: RallySpacing.md) {
                Image(systemName: "location.fill")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(RallyColors.success)

                Text("Check In at Games")
                    .font(RallyTypography.heroTitle)
                    .foregroundStyle(.white)

                Text("Allow location access so Rally can verify your presence at the stadium and award check-in points.")
                    .font(RallyTypography.body)
                    .foregroundStyle(RallyColors.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, RallySpacing.lg)
            }

            Spacer()

            VStack(spacing: RallySpacing.smMd) {
                permissionBenefit(
                    icon: "mappin.and.ellipse",
                    text: "Automatic check-in at venues"
                )
                permissionBenefit(
                    icon: "point.3.filled.connected.trianglepath.dotted",
                    text: "Proximity-based activations"
                )
                permissionBenefit(
                    icon: "lock.shield.fill",
                    text: "Location used only during events"
                )
            }
            .padding(.horizontal, RallySpacing.lg)

            Spacer()

            VStack(spacing: RallySpacing.md) {
                primaryButton(title: "Enable Location") {
                    viewModel.completeOnboarding()
                }

                Button("Not Now") {
                    viewModel.completeOnboarding()
                }
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
            }
            .padding(.horizontal, RallySpacing.lg)
            .padding(.bottom, RallySpacing.xl)
        }
    }

    // MARK: - Reusable Components

    private func featureRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: RallySpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(RallyColors.orange)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: RallySpacing.xs) {
                Text(title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            Spacer()
        }
        .padding(RallySpacing.smMd)
        .background(
            RoundedRectangle(cornerRadius: RallyRadius.small)
                .fill(RallyColors.navyMid.opacity(0.6))
        )
    }

    private func permissionBenefit(icon: String, text: String) -> some View {
        HStack(spacing: RallySpacing.smMd) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(RallyColors.orange)
                .frame(width: 28)

            Text(text)
                .font(RallyTypography.body)
                .foregroundStyle(.white.opacity(0.9))

            Spacer()
        }
    }

    private func primaryButton(title: String, action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            Text(title)
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: RallyRadius.button)
                        .fill(
                            LinearGradient(
                                colors: [RallyColors.orange, RallyColors.orange.opacity(0.85)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                )
        }
    }

    private func selectedSchoolCard(_ school: School) -> some View {
        HStack(spacing: RallySpacing.md) {
            // School logo placeholder
            AsyncImage(url: school.logoURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "building.columns.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(Color(hex: school.theme.primaryColor) ?? RallyColors.orange)
            }
            .frame(width: 48, height: 48)
            .clipShape(RoundedRectangle(cornerRadius: RallyRadius.small))

            VStack(alignment: .leading, spacing: RallySpacing.xs) {
                Text(school.name)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                Text(school.mascot)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(RallyColors.success)
                .font(.system(size: 24))
        }
        .padding(RallySpacing.md)
        .background(
            RoundedRectangle(cornerRadius: RallyRadius.card)
                .fill(RallyColors.navyMid)
                .overlay(
                    RoundedRectangle(cornerRadius: RallyRadius.card)
                        .stroke(RallyColors.success.opacity(0.3), lineWidth: 1)
                )
        )
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                RallyColors.navy,
                RallyColors.navyMid,
                RallyColors.navy
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Actions

    private func requestNotificationPermission() async {
        do {
            let center = UNUserNotificationCenter.current()
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            if granted {
                await MainActor.run {
                    notificationStatus = .authorized
                }
            }
            viewModel.advanceOnboarding()
        } catch {
            // If permission fails, still advance.
            viewModel.advanceOnboarding()
        }
    }
}

// MARK: - Preview

#Preview("Onboarding - Welcome") {
    OnboardingView(viewModel: {
        let vm = AuthViewModel()
        vm.onboardingStep = .welcome
        return vm
    }())
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}

#Preview("Onboarding - School Selection") {
    OnboardingView(viewModel: {
        let vm = AuthViewModel()
        vm.onboardingStep = .schoolSelection
        return vm
    }())
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}

#Preview("Onboarding - Notifications") {
    OnboardingView(viewModel: {
        let vm = AuthViewModel()
        vm.onboardingStep = .notificationPermission
        return vm
    }())
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}

#Preview("Onboarding - Location") {
    OnboardingView(viewModel: {
        let vm = AuthViewModel()
        vm.onboardingStep = .locationPermission
        return vm
    }())
    .environment(ThemeEngine())
    .preferredColorScheme(.dark)
}
