import Foundation

/// Application environment configuration loaded from xcconfig/Info.plist.
public enum AppEnvironment: String, Sendable {
    case development
    case staging
    case production

    public static var current: AppEnvironment {
        guard let value = Bundle.main.infoDictionary?["RALLY_ENVIRONMENT"] as? String,
              let env = AppEnvironment(rawValue: value) else {
            #if DEBUG
            return .development
            #else
            return .production
            #endif
        }
        return env
    }

    public var apiBaseURL: URL {
        guard let urlString = Bundle.main.infoDictionary?["RALLY_API_BASE_URL"] as? String,
              let url = URL(string: urlString) else {
            switch self {
            case .development: return URL(string: "https://api-dev.rally.app/v1")!
            case .staging: return URL(string: "https://api-staging.rally.app/v1")!
            case .production: return URL(string: "https://api.rally.app/v1")!
            }
        }
        return url
    }

    public var isDebug: Bool {
        self != .production
    }

    public var verboseLogging: Bool {
        self == .development
    }
}
