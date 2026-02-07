import Foundation
import SwiftData

/// Configures the SwiftData ModelContainer for offline-first persistence.
enum PersistenceContainer {
    /// Creates the shared ModelContainer with all Rally data models.
    static func create() throws -> ModelContainer {
        let schema = Schema([
            CachedSchool.self,
            CachedEvent.self,
            PendingCheckIn.self,
            PendingSubmission.self,
            LocalPointsTransaction.self,
            CachedReward.self,
            CachedContentItem.self,
        ])

        let configuration = ModelConfiguration(
            "Rally",
            schema: schema,
            isStoredInMemoryOnly: false,
            allowsSave: true,
            groupContainer: .identifier("group.com.vanwagner.rally")
        )

        return try ModelContainer(
            for: schema,
            configurations: [configuration]
        )
    }

    /// Creates an in-memory container for previews and testing.
    static func preview() throws -> ModelContainer {
        let schema = Schema([
            CachedSchool.self,
            CachedEvent.self,
            PendingCheckIn.self,
            PendingSubmission.self,
            LocalPointsTransaction.self,
            CachedReward.self,
            CachedContentItem.self,
        ])

        let configuration = ModelConfiguration(
            "RallyPreview",
            schema: schema,
            isStoredInMemoryOnly: true
        )

        return try ModelContainer(
            for: schema,
            configurations: [configuration]
        )
    }
}
