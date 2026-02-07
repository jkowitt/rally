import Testing
import SwiftUI
@testable import RallyCore

@Suite("Extension Tests")
struct ExtensionTests {

    @Test("Color from 6-digit hex string")
    func colorFromHex6() {
        let color = Color(hex: "#FF6B35")
        #expect(color != nil)
    }

    @Test("Color from hex without hash")
    func colorFromHexNoHash() {
        let color = Color(hex: "FF6B35")
        #expect(color != nil)
    }

    @Test("Color from 8-digit hex with alpha")
    func colorFromHex8() {
        let color = Color(hex: "#FF6B35CC")
        #expect(color != nil)
    }

    @Test("Color from invalid hex returns nil")
    func colorFromInvalidHex() {
        let color = Color(hex: "ZZZZZZ")
        #expect(color == nil)
    }

    @Test("Color from empty string returns nil")
    func colorFromEmptyString() {
        let color = Color(hex: "")
        #expect(color == nil)
    }

    @Test("Int points formatting")
    func pointsFormatting() {
        #expect(500.pointsFormatted == "500 pts")
        #expect(1250.pointsFormatted == "1,250 pts")
    }

    @Test("Int abbreviated formatting")
    func abbreviatedFormatting() {
        #expect(500.abbreviated == "500")
        #expect(1500.abbreviated == "1.5K")
        #expect(1_500_000.abbreviated == "1.5M")
    }

    @Test("Date countdown components for future date")
    func countdownFuture() {
        let futureDate = Date.now.addingTimeInterval(90061) // ~1 day, 1 hour, 1 minute, 1 second
        let components = futureDate.countdownComponents
        #expect(components != nil)
        #expect(components?.days == 1)
    }

    @Test("Date countdown components for past date returns nil")
    func countdownPast() {
        let pastDate = Date.now.addingTimeInterval(-3600)
        let components = pastDate.countdownComponents
        #expect(components == nil)
    }
}
