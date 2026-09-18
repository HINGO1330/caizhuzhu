import XCTest
@testable import KitchenCore

final class RecipeStoreTests: XCTestCase {
    func testCreateUpdateDeleteRecipe() async throws {
        let store = InMemoryRecipeStore()
        let original = Recipe(name: "番茄炒蛋")

        try await store.create(original)
        let created = try await store.recipe(id: original.id)
        XCTAssertEqual(created?.name, "番茄炒蛋")

        var edited = original
        edited.name = "家常番茄炒蛋"
        try await store.update(edited)
        let updated = try await store.recipe(id: original.id)
        XCTAssertEqual(updated?.name, "家常番茄炒蛋")

        try await store.delete(id: original.id)
        let deleted = try await store.recipe(id: original.id)
        XCTAssertNil(deleted)
    }

    func testCreateRejectsBlankRecipeName() async {
        let store = InMemoryRecipeStore()
        do {
            try await store.create(Recipe(name: "  "))
            XCTFail("Expected invalidName")
        } catch {
            XCTAssertEqual(error as? RecipeError, .invalidName)
        }
    }
}
