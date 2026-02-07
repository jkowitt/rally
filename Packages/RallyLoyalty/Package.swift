// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyLoyalty",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyLoyalty", targets: ["RallyLoyalty"])
    ],
    dependencies: [
        .package(path: "../RallyCore"),
        .package(path: "../RallyNetworking"),
        .package(path: "../RallyUI")
    ],
    targets: [
        .target(
            name: "RallyLoyalty",
            dependencies: [
                "RallyCore",
                "RallyNetworking",
                "RallyUI"
            ],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyLoyaltyTests",
            dependencies: ["RallyLoyalty"]
        )
    ]
)
