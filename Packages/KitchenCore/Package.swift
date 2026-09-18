// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "KitchenCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "KitchenCore", targets: ["KitchenCore"])],
    targets: [
        .target(name: "KitchenCore"),
        .testTarget(name: "KitchenCoreTests", dependencies: ["KitchenCore"]),
    ]
)
