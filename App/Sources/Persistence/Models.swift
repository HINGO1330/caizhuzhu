import Foundation
import SwiftData
import KitchenCore

@Model
final class RecipeRecord {
    @Attribute(.unique) var id: UUID
    var name: String
    var summaryText: String
    var payload: Data
    var createdAt: Date
    var updatedAt: Date

    init(recipe: Recipe) {
        id = recipe.id
        name = recipe.name
        summaryText = recipe.summary
        payload = (try? JSONEncoder().encode(recipe)) ?? Data()
        createdAt = .now
        updatedAt = .now
    }

    var recipe: Recipe {
        (try? JSONDecoder().decode(Recipe.self, from: payload))
            ?? Recipe(id: id, name: name, summary: summaryText)
    }

    func replace(with recipe: Recipe) {
        id = recipe.id
        name = recipe.name
        summaryText = recipe.summary
        payload = (try? JSONEncoder().encode(recipe)) ?? payload
        updatedAt = .now
    }
}

@Model
final class ShoppingItemRecord {
    @Attribute(.unique) var id: UUID
    var name: String
    var quantityText: String
    var unit: String
    var isChecked: Bool
    var sourceMenuID: UUID?

    init(item: ShoppingItem) {
        id = item.id
        name = item.name
        quantityText = NSDecimalNumber(decimal: item.quantity).stringValue
        unit = item.unit
        isChecked = item.isChecked
        sourceMenuID = nil
    }
}

@Model
final class TodayMenuRecord {
    @Attribute(.unique) var id: UUID
    var recipeID: UUID
    var servings: Int
    var addedAt: Date

    init(recipeID: UUID, servings: Int) {
        id = UUID()
        self.recipeID = recipeID
        self.servings = servings
        addedAt = .now
    }
}

@Model
final class InventoryEventRecord {
    @Attribute(.unique) var id: UUID
    var ingredientName: String
    var unit: String
    var quantityText: String
    var kindRawValue: String
    var occurredAt: Date
    var purchaseDate: Date?
    var shelfLifeDays: Int?
    var batchID: UUID?

    init(event: InventoryEvent) {
        id = event.id
        ingredientName = event.ingredientName
        unit = event.unit
        quantityText = NSDecimalNumber(decimal: event.quantity).stringValue
        kindRawValue = event.kind.rawValue
        occurredAt = event.occurredAt
        purchaseDate = event.purchaseDate
        shelfLifeDays = event.shelfLifeDays
        batchID = event.batchID
    }

    var event: InventoryEvent {
        InventoryEvent(
            id: id,
            ingredientName: ingredientName,
            unit: unit,
            quantity: Decimal(string: quantityText) ?? 0,
            kind: InventoryEventKind(rawValue: kindRawValue) ?? .adjusted,
            occurredAt: occurredAt,
            purchaseDate: purchaseDate,
            shelfLifeDays: shelfLifeDays,
            batchID: batchID
        )
    }
}

@Model
final class ImportDraftRecord {
    @Attribute(.unique) var id: UUID
    var sourcePayload: Data
    var candidatePayload: Data
    var statusRawValue: String
    var createdAt: Date

    init(draft: ImportDraft) {
        id = draft.id
        sourcePayload = (try? JSONEncoder().encode(draft.source)) ?? Data()
        candidatePayload = (try? JSONEncoder().encode(draft.candidate)) ?? Data()
        statusRawValue = draft.status.rawValue
        createdAt = .now
    }

    var source: ImportSource? {
        try? JSONDecoder().decode(ImportSource.self, from: sourcePayload)
    }

    var candidate: Recipe {
        get { (try? JSONDecoder().decode(Recipe.self, from: candidatePayload)) ?? Recipe(name: "待确认导入") }
        set { candidatePayload = (try? JSONEncoder().encode(newValue)) ?? candidatePayload }
    }
}
