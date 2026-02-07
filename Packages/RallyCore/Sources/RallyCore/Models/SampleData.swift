import Foundation

// MARK: - Sample Data for Previews and Development

public extension School {
    static let samples: [School] = [
        School(
            id: "msu",
            name: "Mountain State University",
            mascot: "Mountaineers",
            abbreviation: "MSU",
            theme: SchoolTheme(
                primaryColor: "#1B365D",
                secondaryColor: "#EAAA00",
                accentColor: "#FFFFFF"
            ),
            venues: [
                Venue(
                    id: "msu-stadium",
                    name: "Mountaineer Stadium",
                    latitude: 39.6500,
                    longitude: -79.9559,
                    radiusMeters: 500,
                    beaconUUID: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
                    sport: .football
                )
            ]
        ),
        School(
            id: "rsu",
            name: "Riverside State University",
            mascot: "Otters",
            abbreviation: "RSU",
            theme: SchoolTheme(
                primaryColor: "#CC0000",
                secondaryColor: "#333333",
                accentColor: "#FFFFFF"
            )
        ),
        School(
            id: "pcu",
            name: "Pacific Coast University",
            mascot: "Waves",
            abbreviation: "PCU",
            theme: SchoolTheme(
                primaryColor: "#003262",
                secondaryColor: "#FDB515",
                accentColor: "#FFFFFF"
            )
        ),
        School(
            id: "lsu",
            name: "Lakeshore University",
            mascot: "Eagles",
            abbreviation: "LU",
            theme: SchoolTheme(
                primaryColor: "#461D7C",
                secondaryColor: "#FDD023",
                accentColor: "#FFFFFF"
            )
        ),
        School(
            id: "stu",
            name: "Sunnyside Tech University",
            mascot: "Firebirds",
            abbreviation: "STU",
            theme: SchoolTheme(
                primaryColor: "#FF6B35",
                secondaryColor: "#131B2E",
                accentColor: "#2D9CDB"
            )
        )
    ]

    static let sample = samples[0]
}

public extension Event {
    static let samples: [Event] = [
        Event(
            id: "evt-001",
            schoolID: "msu",
            sport: .football,
            title: "MSU vs. Rival University",
            opponent: "Rival University",
            venueID: "msu-stadium",
            startTime: Date.now.addingTimeInterval(86400 * 3),
            status: .upcoming,
            activations: Activation.samples
        ),
        Event(
            id: "evt-002",
            schoolID: "msu",
            sport: .football,
            title: "MSU vs. State College",
            opponent: "State College",
            venueID: "msu-stadium",
            startTime: Date.now.addingTimeInterval(-3600),
            status: .live,
            homeScore: 24,
            awayScore: 17
        ),
        Event(
            id: "evt-003",
            schoolID: "msu",
            sport: .basketball,
            title: "MSU vs. Tech University",
            opponent: "Tech University",
            venueID: "msu-arena",
            startTime: Date.now.addingTimeInterval(86400 * 10),
            status: .upcoming
        )
    ]

    static let sample = samples[0]
}

public extension Activation {
    static let samples: [Activation] = [
        Activation(
            id: "act-001",
            eventID: "evt-001",
            type: .prediction,
            title: "Halftime Score Prediction",
            description: "Predict the halftime score to earn bonus points!",
            pointsValue: 50,
            status: .active,
            payload: ActivationPayload(
                question: "What will the halftime score be?",
                options: [
                    ActivationOption(id: "opt-1", text: "MSU leads by 7+"),
                    ActivationOption(id: "opt-2", text: "MSU leads by 1-6"),
                    ActivationOption(id: "opt-3", text: "Tied"),
                    ActivationOption(id: "opt-4", text: "Rival leads")
                ]
            )
        ),
        Activation(
            id: "act-002",
            eventID: "evt-001",
            type: .trivia,
            title: "Mountaineer Trivia",
            description: "Test your MSU knowledge!",
            pointsValue: 25,
            status: .upcoming,
            payload: ActivationPayload(
                question: "Who holds the MSU all-time rushing record?",
                options: [
                    ActivationOption(id: "opt-a", text: "Player A"),
                    ActivationOption(id: "opt-b", text: "Player B"),
                    ActivationOption(id: "opt-c", text: "Player C"),
                    ActivationOption(id: "opt-d", text: "Player D")
                ],
                correctOptionID: "opt-b",
                timeLimit: 30
            )
        ),
        Activation(
            id: "act-003",
            eventID: "evt-001",
            type: .noiseMeter,
            title: "4th Quarter Noise Meter",
            description: "Make some noise! Loudest section wins!",
            pointsValue: 30,
            status: .upcoming
        ),
        Activation(
            id: "act-004",
            eventID: "evt-001",
            type: .poll,
            title: "Game MVP Poll",
            description: "Vote for the player of the game",
            pointsValue: 10,
            status: .upcoming,
            payload: ActivationPayload(
                question: "Who is the Player of the Game?",
                options: [
                    ActivationOption(id: "mvp-1", text: "QB #7"),
                    ActivationOption(id: "mvp-2", text: "RB #22"),
                    ActivationOption(id: "mvp-3", text: "WR #15")
                ]
            )
        )
    ]

    static let sample = samples[0]
}

public extension Reward {
    static let samples: [Reward] = [
        Reward(
            id: "rwd-001",
            schoolID: "msu",
            title: "Rally T-Shirt",
            description: "Official Rally branded t-shirt in your school colors.",
            pointsCost: 500,
            category: .merchandise,
            minimumTier: .starter
        ),
        Reward(
            id: "rwd-002",
            schoolID: "msu",
            title: "Free Concession Drink",
            description: "Redeem for any fountain drink at participating concession stands.",
            pointsCost: 200,
            category: .concessions,
            minimumTier: .rookie
        ),
        Reward(
            id: "rwd-003",
            schoolID: "msu",
            title: "Sideline Pass Experience",
            description: "Pre-game sideline access for you and a guest.",
            pointsCost: 2500,
            category: .experiences,
            minimumTier: .allStar
        ),
        Reward(
            id: "rwd-004",
            schoolID: "msu",
            title: "Student Section Upgrade",
            description: "Upgrade to premium student section seating.",
            pointsCost: 1000,
            category: .tickets,
            minimumTier: .starter
        ),
        Reward(
            id: "rwd-005",
            schoolID: "msu",
            title: "Digital Wallpaper Pack",
            description: "Exclusive MSU digital wallpapers for your phone.",
            pointsCost: 100,
            category: .digital,
            minimumTier: .rookie
        ),
        Reward(
            id: "rwd-006",
            schoolID: "msu",
            title: "Partner Discount: Campus Bookstore",
            description: "15% off at the campus bookstore.",
            pointsCost: 300,
            category: .partner,
            minimumTier: .starter,
            sponsorID: "sponsor-bookstore"
        )
    ]

    static let sample = samples[0]
}

public extension UserProfile {
    static let sample = UserProfile(
        id: "user-001",
        email: "fan@example.com",
        displayName: "Alex Fan",
        schoolID: "msu",
        tier: .starter,
        pointsBalance: 1250,
        lifetimePoints: 1250,
        checkInCount: 12,
        joinedAt: Date.now.addingTimeInterval(-86400 * 90)
    )
}

public extension LeaderboardEntry {
    static let samples: [LeaderboardEntry] = [
        LeaderboardEntry(id: "lb-1", userID: "u1", displayName: "SuperFan99", score: 450, rank: 1, tier: .mvp),
        LeaderboardEntry(id: "lb-2", userID: "u2", displayName: "GoTeamGo", score: 380, rank: 2, tier: .allStar),
        LeaderboardEntry(id: "lb-3", userID: "u3", displayName: "Section12", score: 340, rank: 3, tier: .allStar),
        LeaderboardEntry(id: "lb-4", userID: "user-001", displayName: "Alex Fan", score: 275, rank: 4, tier: .starter),
        LeaderboardEntry(id: "lb-5", userID: "u5", displayName: "MascotLover", score: 210, rank: 5, tier: .starter)
    ]
}
