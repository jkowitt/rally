// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyAnalytics",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyAnalytics", targets: ["RallyAnalytics"])
    ],
    dependencies: [
        .package(path: "../RallyCore")
    ],
    targets: [
        .target(
            name: "RallyAnalytics",
            dependencies: ["RallyCore"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyAnalyticsTests",
            dependencies: ["RallyAnalytics"]
        )
    ]
)
