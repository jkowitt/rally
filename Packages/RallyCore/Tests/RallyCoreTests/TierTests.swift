import Testing
@testable import RallyCore

@Suite("Tier Tests")
struct TierTests {

    @Test("Tier minimum points thresholds")
    func minimumPoints() {
        #expect(Tier.rookie.minimumPoints == 0)
        #expect(Tier.starter.minimumPoints == 500)
        #expect(Tier.allStar.minimumPoints == 2_000)
        #expect(Tier.mvp.minimumPoints == 5_000)
        #expect(Tier.hallOfFame.minimumPoints == 15_000)
    }

    @Test("Tier ordering is correct")
    func ordering() {
        #expect(Tier.rookie < Tier.starter)
        #expect(Tier.starter < Tier.allStar)
        #expect(Tier.allStar < Tier.mvp)
        #expect(Tier.mvp < Tier.hallOfFame)
    }

    @Test("Next tier progression")
    func nextTier() {
        #expect(Tier.rookie.nextTier == .starter)
        #expect(Tier.starter.nextTier == .allStar)
        #expect(Tier.allStar.nextTier == .mvp)
        #expect(Tier.mvp.nextTier == .hallOfFame)
        #expect(Tier.hallOfFame.nextTier == nil)
    }

    @Test("All tiers exist in CaseIterable")
    func allCases() {
        #expect(Tier.allCases.count == 5)
    }

    @Test("Tier raw values for API encoding")
    func rawValues() {
        #expect(Tier.rookie.rawValue == "Rookie")
        #expect(Tier.hallOfFame.rawValue == "Hall of Fame")
    }
}
