import SwiftUI
import RallyCore

/// Main tab navigation with 4 primary tabs.
struct MainTabView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @State private var selectedTab: Tab = .home
    @State private var homePath = NavigationPath()
    @State private var gamedayPath = NavigationPath()
    @State private var rewardsPath = NavigationPath()
    @State private var profilePath = NavigationPath()

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $homePath) {
                HomeView()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(Tab.home)

            NavigationStack(path: $gamedayPath) {
                GamedayTabView()
            }
            .tabItem {
                Label("Gameday", systemImage: "sportscourt.fill")
            }
            .tag(Tab.gameday)

            NavigationStack(path: $rewardsPath) {
                RewardsTabView()
            }
            .tabItem {
                Label("Rewards", systemImage: "gift.fill")
            }
            .tag(Tab.rewards)

            NavigationStack(path: $profilePath) {
                ProfileTabView()
            }
            .tabItem {
                Label("Profile", systemImage: "person.fill")
            }
            .tag(Tab.profile)
        }
        .tint(themeEngine.activeTheme.primaryColor)
        .onOpenURL { url in
            handleDeepLink(url)
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }
        let pathComponents = components.path.split(separator: "/").map(String.init)

        // rally://school/{schoolId}/event/{eventId}
        if pathComponents.count >= 4,
           pathComponents[0] == "school",
           pathComponents[2] == "event" {
            selectedTab = .gameday
        }
    }
}

// MARK: - Tab Definition

enum Tab: String, Hashable {
    case home
    case gameday
    case rewards
    case profile
}

// MARK: - Route Definition

enum Route: Hashable {
    case eventDetail(String)
    case rewardDetail(String)
    case settings
    case pointsHistory
    case leaderboard(String)
    case contentDetail(String)
    case schoolSelector
}

// MARK: - Home Tab

struct HomeView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @Environment(AppContainer.self) private var container

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: RallySpacing.lg) {
                    // Welcome Header
                    welcomeHeader

                    // Upcoming Event Card
                    upcomingEventSection

                    // Points Summary
                    pointsSummary

                    // Content Feed Preview
                    contentFeedPreview
                }
                .padding(RallySpacing.md)
            }
        }
        .navigationTitle("Rally")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private var welcomeHeader: some View {
        VStack(alignment: .leading, spacing: RallySpacing.xs) {
            if case .authenticated(let user) = container.authState {
                Text("Hey, \(user.displayName)!")
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)
            }
            if let school = container.selectedSchool {
                Text("Go \(school.mascot)!")
                    .font(RallyTypography.subtitle)
                    .foregroundStyle(themeEngine.activeTheme.primaryColor)
            }
        }
    }

    private var upcomingEventSection: some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            Text("Next Game")
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)

            RoundedRectangle(cornerRadius: RallyRadius.card)
                .fill(RallyColors.navyMid)
                .frame(height: 160)
                .overlay {
                    VStack(spacing: RallySpacing.sm) {
                        Image(systemName: "football.fill")
                            .font(.title)
                            .foregroundStyle(themeEngine.activeTheme.primaryColor)
                        Text("vs. Rival University")
                            .font(RallyTypography.cardTitle)
                            .foregroundStyle(.white)
                        Text("Saturday, Oct 12 \u{2022} 3:30 PM")
                            .font(RallyTypography.caption)
                            .foregroundStyle(RallyColors.gray)
                    }
                }
        }
    }

    private var pointsSummary: some View {
        HStack(spacing: RallySpacing.md) {
            pointsCard(title: "Balance", value: "1,250", icon: "star.fill")
            pointsCard(title: "Tier", value: "Starter", icon: "trophy")
        }
    }

    private func pointsCard(title: String, value: String, icon: String) -> some View {
        VStack(spacing: RallySpacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(themeEngine.activeTheme.primaryColor)
            Text(value)
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(.white)
            Text(title)
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(RallySpacing.md)
        .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
    }

    private var contentFeedPreview: some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            HStack {
                Text("Latest")
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                Spacer()
                Button("See All") {}
                    .font(RallyTypography.caption)
                    .foregroundStyle(themeEngine.activeTheme.primaryColor)
            }

            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: RallyRadius.card)
                    .fill(RallyColors.navyMid)
                    .frame(height: 80)
                    .overlay {
                        HStack {
                            RoundedRectangle(cornerRadius: RallyRadius.small)
                                .fill(RallyColors.navy)
                                .frame(width: 64, height: 64)
                            VStack(alignment: .leading, spacing: 4) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.1))
                                    .frame(height: 14)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.05))
                                    .frame(width: 120, height: 12)
                            }
                            Spacer()
                        }
                        .padding(RallySpacing.sm)
                    }
            }
        }
    }
}

// MARK: - Gameday Tab

struct GamedayTabView: View {
    @Environment(ThemeEngine.self) private var themeEngine
    @State private var isCheckedIn = false

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: RallySpacing.lg) {
                    // Gameday Status
                    gamedayStatus

                    // Check-in CTA
                    if !isCheckedIn {
                        checkInButton
                    } else {
                        checkedInConfirmation
                    }

                    // Activations
                    activationsSection
                }
                .padding(RallySpacing.md)
            }
        }
        .navigationTitle("Gameday")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private var gamedayStatus: some View {
        VStack(spacing: RallySpacing.sm) {
            HStack {
                VStack {
                    Text("HOME")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                    Text("24")
                        .font(RallyTypography.heroTitle)
                        .foregroundStyle(.white)
                }
                Spacer()
                VStack(spacing: 4) {
                    Text("Q3")
                        .font(RallyTypography.caption)
                        .foregroundStyle(themeEngine.activeTheme.primaryColor)
                    Text("8:42")
                        .font(RallyTypography.cardTitle)
                        .foregroundStyle(.white)
                        .monospacedDigit()
                }
                Spacer()
                VStack {
                    Text("AWAY")
                        .font(RallyTypography.caption)
                        .foregroundStyle(RallyColors.gray)
                    Text("17")
                        .font(RallyTypography.heroTitle)
                        .foregroundStyle(.white)
                }
            }
            .padding(RallySpacing.lg)
            .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
        }
    }

    private var checkInButton: some View {
        Button {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                isCheckedIn = true
            }
        } label: {
            HStack(spacing: RallySpacing.sm) {
                Image(systemName: "location.fill")
                Text("Check In")
                    .font(RallyTypography.buttonLabel)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, RallySpacing.md)
            .foregroundStyle(.white)
            .background(
                LinearGradient(
                    colors: [themeEngine.activeTheme.primaryColor, themeEngine.activeTheme.primaryColor.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                ),
                in: RoundedRectangle(cornerRadius: RallyRadius.button)
            )
        }
        .accessibilityLabel("Check in at this game")
    }

    private var checkedInConfirmation: some View {
        HStack(spacing: RallySpacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(RallyColors.success)
                .font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text("Checked In!")
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                Text("+100 pts earned")
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.success)
            }
            Spacer()
        }
        .padding(RallySpacing.md)
        .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
    }

    private var activationsSection: some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            Text("Activations")
                .font(RallyTypography.sectionHeader)
                .foregroundStyle(.white)

            activationCard(icon: "questionmark.circle.fill", title: "Halftime Prediction", points: 50, status: "Active")
            activationCard(icon: "brain.head.profile", title: "Trivia Challenge", points: 25, status: "Coming Up")
            activationCard(icon: "waveform", title: "Noise Meter", points: 30, status: "Q4")
        }
    }

    private func activationCard(icon: String, title: String, points: Int, status: String) -> some View {
        HStack(spacing: RallySpacing.md) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(themeEngine.activeTheme.primaryColor)
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(RallyTypography.cardTitle)
                    .foregroundStyle(.white)
                Text(status)
                    .font(RallyTypography.caption)
                    .foregroundStyle(RallyColors.gray)
            }

            Spacer()

            Text("+\(points)")
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(themeEngine.activeTheme.primaryColor)
        }
        .padding(RallySpacing.md)
        .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
        .accessibilityLabel("\(title), \(points) points, \(status)")
    }
}

// MARK: - Rewards Tab

struct RewardsTabView: View {
    @Environment(ThemeEngine.self) private var themeEngine

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: RallySpacing.lg) {
                    // Points Balance
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Your Balance")
                                .font(RallyTypography.caption)
                                .foregroundStyle(RallyColors.gray)
                            Text("1,250 pts")
                                .font(RallyTypography.heroTitle)
                                .foregroundStyle(.white)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Starter")
                                .font(RallyTypography.buttonLabel)
                                .foregroundStyle(themeEngine.activeTheme.primaryColor)
                            Text("750 pts to All-Star")
                                .font(RallyTypography.caption)
                                .foregroundStyle(RallyColors.gray)
                        }
                    }
                    .padding(RallySpacing.md)
                    .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))

                    // Rewards Grid
                    Text("Available Rewards")
                        .font(RallyTypography.sectionHeader)
                        .foregroundStyle(.white)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: RallySpacing.md) {
                        ForEach(Reward.samples) { reward in
                            rewardCard(reward)
                        }
                    }
                }
                .padding(RallySpacing.md)
            }
        }
        .navigationTitle("Rewards")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func rewardCard(_ reward: Reward) -> some View {
        VStack(alignment: .leading, spacing: RallySpacing.sm) {
            RoundedRectangle(cornerRadius: RallyRadius.small)
                .fill(RallyColors.navy)
                .frame(height: 100)
                .overlay {
                    Image(systemName: rewardIcon(for: reward.category))
                        .font(.largeTitle)
                        .foregroundStyle(themeEngine.activeTheme.primaryColor.opacity(0.5))
                }

            Text(reward.title)
                .font(RallyTypography.cardTitle)
                .foregroundStyle(.white)
                .lineLimit(2)

            Text(reward.pointsCost.pointsFormatted)
                .font(RallyTypography.buttonLabel)
                .foregroundStyle(themeEngine.activeTheme.primaryColor)
        }
        .padding(RallySpacing.sm)
        .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
        .accessibilityLabel("\(reward.title), \(reward.pointsCost) points")
    }

    private func rewardIcon(for category: RewardCategory) -> String {
        switch category {
        case .merchandise: return "tshirt.fill"
        case .concessions: return "cup.and.saucer.fill"
        case .experiences: return "star.fill"
        case .tickets: return "ticket.fill"
        case .digital: return "iphone"
        case .partner: return "storefront.fill"
        }
    }
}

// MARK: - Profile Tab

struct ProfileTabView: View {
    @Environment(AppContainer.self) private var container
    @Environment(ThemeEngine.self) private var themeEngine

    var body: some View {
        ZStack {
            RallyColors.navy
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: RallySpacing.lg) {
                    // Avatar + Name
                    profileHeader

                    // Stats
                    statsSection

                    // Menu Items
                    menuSection
                }
                .padding(RallySpacing.md)
            }
        }
        .navigationTitle("Profile")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private var profileHeader: some View {
        VStack(spacing: RallySpacing.sm) {
            Circle()
                .fill(themeEngine.activeTheme.primaryColor.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.title)
                        .foregroundStyle(themeEngine.activeTheme.primaryColor)
                }

            if case .authenticated(let user) = container.authState {
                Text(user.displayName)
                    .font(RallyTypography.sectionHeader)
                    .foregroundStyle(.white)

                Text(user.tier.rawValue)
                    .font(RallyTypography.buttonLabel)
                    .foregroundStyle(themeEngine.activeTheme.primaryColor)
                    .padding(.horizontal, RallySpacing.md)
                    .padding(.vertical, RallySpacing.xs)
                    .background(
                        Capsule()
                            .fill(themeEngine.activeTheme.primaryColor.opacity(0.15))
                    )
            }
        }
    }

    private var statsSection: some View {
        HStack(spacing: RallySpacing.md) {
            statItem(value: "12", label: "Games")
            Divider()
                .frame(height: 40)
                .overlay(RallyColors.gray.opacity(0.3))
            statItem(value: "1,250", label: "Points")
            Divider()
                .frame(height: 40)
                .overlay(RallyColors.gray.opacity(0.3))
            statItem(value: "3", label: "Rewards")
        }
        .padding(RallySpacing.md)
        .frame(maxWidth: .infinity)
        .background(RallyColors.navyMid, in: RoundedRectangle(cornerRadius: RallyRadius.card))
    }

    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(RallyTypography.pointsDisplay)
                .foregroundStyle(.white)
            Text(label)
                .font(RallyTypography.caption)
                .foregroundStyle(RallyColors.gray)
        }
        .frame(maxWidth: .infinity)
    }

    private var menuSection: some View {
        VStack(spacing: 1) {
            menuRow(icon: "clock.fill", title: "Points History")
            menuRow(icon: "trophy.fill", title: "My Rewards")
            menuRow(icon: "bell.fill", title: "Notifications")
            menuRow(icon: "gearshape.fill", title: "Settings")
            menuRow(icon: "questionmark.circle.fill", title: "Help & Support")

            Button {
                container.signOut()
            } label: {
                HStack(spacing: RallySpacing.md) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(RallyColors.error)
                        .frame(width: 24)
                    Text("Sign Out")
                        .font(RallyTypography.body)
                        .foregroundStyle(RallyColors.error)
                    Spacer()
                }
                .padding(RallySpacing.md)
                .background(RallyColors.navyMid)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: RallyRadius.card))
    }

    private func menuRow(icon: String, title: String) -> some View {
        Button {} label: {
            HStack(spacing: RallySpacing.md) {
                Image(systemName: icon)
                    .foregroundStyle(themeEngine.activeTheme.primaryColor)
                    .frame(width: 24)
                Text(title)
                    .font(RallyTypography.body)
                    .foregroundStyle(.white)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(RallyColors.gray)
            }
            .padding(RallySpacing.md)
            .background(RallyColors.navyMid)
        }
    }
}

#Preview("Main Tab View") {
    MainTabView()
        .environment(AppContainer())
        .environment(ThemeEngine())
}
