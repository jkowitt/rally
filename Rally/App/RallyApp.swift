import SwiftUI
import RallyCore

/// Rally iOS application entry point.
@main
struct RallyApp: App {
    @State private var appContainer = AppContainer()
    @State private var themeEngine = ThemeEngine()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appContainer)
                .environment(themeEngine)
                .preferredColorScheme(.dark)
                .tint(themeEngine.activeTheme.primaryColor)
        }
    }
}
