import Testing
import SwiftUI
@testable import RallyCore

@Suite("ThemeEngine Tests")
@MainActor
struct ThemeEngineTests {

    @Test("Default theme is Rally brand")
    func defaultTheme() {
        let engine = ThemeEngine()
        #expect(engine.currentSchool == nil)
        #expect(engine.activeTheme.primaryColor == RallyColors.orange)
    }

    @Test("Applying school updates theme")
    func applySchool() {
        let engine = ThemeEngine()
        let school = School.sample
        engine.applySchool(school)
        #expect(engine.currentSchool?.id == school.id)
    }

    @Test("Reset restores default theme")
    func resetTheme() {
        let engine = ThemeEngine()
        engine.applySchool(.sample)
        engine.resetToDefault()
        #expect(engine.currentSchool == nil)
        #expect(engine.activeTheme.primaryColor == RallyColors.orange)
    }

    @Test("RallyTheme from SchoolTheme resolves colors")
    func themeFromSchoolTheme() {
        let schoolTheme = SchoolTheme(
            primaryColor: "#CC0000",
            secondaryColor: "#333333",
            accentColor: "#FFFFFF"
        )
        let theme = RallyTheme(from: schoolTheme)
        #expect(theme.primaryColor != RallyColors.orange)
    }

    @Test("RallyTheme handles invalid hex gracefully")
    func themeInvalidHex() {
        let schoolTheme = SchoolTheme(
            primaryColor: "invalid",
            secondaryColor: "invalid",
            accentColor: "invalid"
        )
        let theme = RallyTheme(from: schoolTheme)
        // Falls back to Rally defaults
        #expect(theme.primaryColor == RallyColors.orange)
    }
}
