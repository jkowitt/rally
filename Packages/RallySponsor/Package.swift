// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallySponsor",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallySponsor", targets: ["RallySponsor"])
    ],
    dependencies: [
        .package(path: "../RallyCore"),
        .package(path: "../RallyNetworking")
    ],
    targets: [
        .target(
            name: "RallySponsor",
            dependencies: ["RallyCore", "RallyNetworking"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallySponsorTests",
            dependencies: ["RallySponsor"]
        )
    ]
)
