// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyCore",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyCore", targets: ["RallyCore"])
    ],
    targets: [
        .target(
            name: "RallyCore",
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyCoreTests",
            dependencies: ["RallyCore"]
        )
    ]
)
