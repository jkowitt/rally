// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "RallyWidgets",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "RallyWidgets", targets: ["RallyWidgets"])
    ],
    dependencies: [
        .package(path: "../RallyCore")
    ],
    targets: [
        .target(
            name: "RallyWidgets",
            dependencies: ["RallyCore"],
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "RallyWidgetsTests",
            dependencies: ["RallyWidgets"]
        )
    ]
)
