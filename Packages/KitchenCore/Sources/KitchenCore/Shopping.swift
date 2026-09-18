import Foundation

public struct ShoppingItem: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var name: String
    public var quantity: Decimal
    public var unit: String
    public var isChecked: Bool

    public init(
        id: UUID = UUID(),
        name: String,
        quantity: Decimal,
        unit: String,
        isChecked: Bool = false
    ) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.isChecked = isChecked
    }
}

public enum ShoppingListGenerator {
    public static func items(from recipe: Recipe, desiredServings: Int) -> [ShoppingItem] {
        guard recipe.servings > 0, desiredServings > 0 else { return [] }
        let scale = Decimal(desiredServings) / Decimal(recipe.servings)
        var totals: [IngredientKey: Decimal] = [:]
        var displayNames: [IngredientKey: String] = [:]

        for ingredient in recipe.ingredients {
            let key = IngredientKey(name: ingredient.name, unit: UnitNormalizer.normalize(ingredient.unit))
            totals[key, default: 0] += ingredient.quantity * scale
            displayNames[key] = ingredient.name.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        return totals.map { key, quantity in
            ShoppingItem(
                name: displayNames[key] ?? key.name,
                quantity: quantity,
                unit: key.unit
            )
        }
        .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }
}

public enum UnitNormalizer {
    public static func normalize(_ unit: String) -> String {
        let value = unit.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch value {
        case "颗", "枚", "只", "粒": return "个"
        case "g": return "克"
        case "kg": return "千克"
        case "ml": return "毫升"
        case "l": return "升"
        default: return value
        }
    }
}

struct IngredientKey: Hashable, Sendable {
    let name: String
    let unit: String

    init(name: String, unit: String) {
        self.name = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        self.unit = unit.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}
