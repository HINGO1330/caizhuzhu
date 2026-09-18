import XCTest
@testable import KitchenCore

final class ShoppingTests: XCTestCase {
    func testGeneratorMergesMatchingIngredientsAndScalesServings() {
        let recipe = Recipe(
            name: "番茄炒蛋",
            ingredients: [
                Ingredient(name: "番茄", quantity: 2, unit: "个"),
                Ingredient(name: "番茄", quantity: 1, unit: "个"),
            ],
            servings: 2
        )

        let items = ShoppingListGenerator.items(from: recipe, desiredServings: 4)

        XCTAssertEqual(items.count, 1)
        XCTAssertEqual(items[0].quantity, 6)
        XCTAssertEqual(items[0].name, "番茄")
    }
}
