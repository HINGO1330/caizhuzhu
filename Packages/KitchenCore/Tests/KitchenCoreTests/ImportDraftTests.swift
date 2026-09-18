import XCTest
@testable import KitchenCore

final class ImportDraftTests: XCTestCase {
    func testPendingDraftRequiresExplicitConfirmationToProduceRecipe() throws {
        var draft = ImportDraft(source: .text("番茄炒蛋"), candidate: Recipe(name: "番茄炒蛋"))

        let recipe = try draft.confirm()

        XCTAssertEqual(recipe.name, "番茄炒蛋")
        XCTAssertEqual(draft.status, .confirmed)
    }

    func testConfirmedDraftCannotBeConfirmedAgain() throws {
        var draft = ImportDraft(source: .text("番茄炒蛋"), candidate: Recipe(name: "番茄炒蛋"))
        _ = try draft.confirm()

        XCTAssertThrowsError(try draft.confirm()) { error in
            XCTAssertEqual(error as? ImportDraftError, .invalidTransition)
        }
    }
}
