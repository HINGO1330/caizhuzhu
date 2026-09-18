import XCTest
@testable import KitchenCore

final class InventoryTests: XCTestCase {
    func testBalanceIsDerivedFromAllEvents() {
        let events = [
            InventoryEvent(ingredientName: "鸡蛋", unit: "个", quantity: 10, kind: .stocked),
            InventoryEvent(ingredientName: "鸡蛋", unit: "个", quantity: 3, kind: .consumed),
            InventoryEvent(ingredientName: "鸡蛋", unit: "个", quantity: -1, kind: .adjusted),
        ]

        let balances = InventoryLedger.balances(from: events)

        XCTAssertEqual(balances.first?.quantity, 6)
    }
}
