// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyContent",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyContent", targets: ["RallyContent"])
    ],
    dependencies: [
        .package(path: "../RallyCore"),
        .package(path: "../RallyNetworking"),
        .package(path: "../RallyUI")
    ],
    targets: [
        .target(
            name: "RallyContent",
            dependencies: ["RallyCore", "RallyNetworking", "RallyUI"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyContentTests",
            dependencies: ["RallyContent"]
        )
    ]
)
