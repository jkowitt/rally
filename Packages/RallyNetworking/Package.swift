// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyNetworking",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyNetworking", targets: ["RallyNetworking"])
    ],
    dependencies: [
        .package(path: "../RallyCore")
    ],
    targets: [
        .target(
            name: "RallyNetworking",
            dependencies: ["RallyCore"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyNetworkingTests",
            dependencies: ["RallyNetworking"]
        )
    ]
)
