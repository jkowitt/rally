// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyAuth",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyAuth", targets: ["RallyAuth"])
    ],
    dependencies: [
        .package(path: "../RallyCore"),
        .package(path: "../RallyNetworking")
    ],
    targets: [
        .target(
            name: "RallyAuth",
            dependencies: ["RallyCore", "RallyNetworking"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyAuthTests",
            dependencies: ["RallyAuth"]
        )
    ]
)
