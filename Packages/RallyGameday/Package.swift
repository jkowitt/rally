// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyGameday",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyGameday", targets: ["RallyGameday"])
    ],
    dependencies: [
        .package(path: "../RallyCore"),
        .package(path: "../RallyNetworking"),
        .package(path: "../RallyUI"),
        .package(path: "../RallyLocation")
    ],
    targets: [
        .target(
            name: "RallyGameday",
            dependencies: [
                "RallyCore",
                "RallyNetworking",
                "RallyUI",
                "RallyLocation"
            ],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyGamedayTests",
            dependencies: ["RallyGameday"]
        )
    ]
)
