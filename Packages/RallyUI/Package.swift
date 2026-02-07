// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyUI",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyUI", targets: ["RallyUI"])
    ],
    dependencies: [
        .package(path: "../RallyCore")
    ],
    targets: [
        .target(
            name: "RallyUI",
            dependencies: ["RallyCore"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyUITests",
            dependencies: ["RallyUI"]
        )
    ]
)
