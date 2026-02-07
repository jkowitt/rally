// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyLocation",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyLocation", targets: ["RallyLocation"])
    ],
    dependencies: [
        .package(path: "../RallyCore")
    ],
    targets: [
        .target(
            name: "RallyLocation",
            dependencies: ["RallyCore"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyLocationTests",
            dependencies: ["RallyLocation"]
        )
    ]
)
