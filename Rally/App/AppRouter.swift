import SwiftUI
import RallyCore

/// Handles deep link parsing and route dispatch for the Rally app.
@MainActor
@Observable
final class AppRouter {
    var selectedTab: Tab = .home
    var pendingRoute: Route?

    /// Parse a universal link or custom scheme URL into a navigation action.
    func handle(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }

        // Support both rally:// and https://rally.app/ URL schemes
        let pathComponents = components.path
            .split(separator: "/")
            .map(String.init)

        parseRoute(from: pathComponents)
    }

    private func parseRoute(from path: [String]) {
        guard !path.isEmpty else { return }

        switch path.first {
        case "school":
            // rally://school/{id}/event/{eventId}
            if path.count >= 4, path[2] == "event" {
                selectedTab = .gameday
                pendingRoute = .eventDetail(path[3])
            }

        case "event":
            // rally://event/{id}
            if path.count >= 2 {
                selectedTab = .gameday
                pendingRoute = .eventDetail(path[1])
            }

        case "reward":
            // rally://reward/{id}
            if path.count >= 2 {
                selectedTab = .rewards
                pendingRoute = .rewardDetail(path[1])
            }

        case "leaderboard":
            // rally://leaderboard/{eventId}
            if path.count >= 2 {
                selectedTab = .gameday
                pendingRoute = .leaderboard(path[1])
            }

        case "settings":
            selectedTab = .profile
            pendingRoute = .settings

        case "points":
            selectedTab = .profile
            pendingRoute = .pointsHistory

        default:
            break
        }
    }

    func consumePendingRoute() -> Route? {
        defer { pendingRoute = nil }
        return pendingRoute
    }
}
