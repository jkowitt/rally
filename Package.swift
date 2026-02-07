// swift-tools-version: 5.10

import PackageDescription

/// Root workspace package for the Rally iOS application.
/// Individual feature packages are in Packages/ and referenced as local dependencies.
/// The Xcode project references these packages directly for the app target build.
let package = Package(
    name: "Rally",
    platforms: [.iOS(.v17)],
    products: [],
    dependencies: [
        .package(path: "Packages/RallyCore"),
        .package(path: "Packages/RallyNetworking"),
        .package(path: "Packages/RallyUI"),
        .package(path: "Packages/RallyAuth"),
        .package(path: "Packages/RallyGameday"),
        .package(path: "Packages/RallyLoyalty"),
        .package(path: "Packages/RallyContent"),
        .package(path: "Packages/RallySponsor"),
        .package(path: "Packages/RallyLocation"),
        .package(path: "Packages/RallyAnalytics"),
        .package(path: "Packages/RallyWidgets"),
    ],
    targets: []
)
