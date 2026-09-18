import Foundation

public enum InventoryEventKind: String, Codable, Hashable, Sendable {
    case stocked
    case consumed
    case adjusted
}

public struct InventoryEvent: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var ingredientName: String
    public var unit: String
    public var quantity: Decimal
    public var kind: InventoryEventKind
    public var occurredAt: Date
    public var purchaseDate: Date?
    public var shelfLifeDays: Int?
    public var batchID: UUID?

    public init(
        id: UUID = UUID(),
        ingredientName: String,
        unit: String,
        quantity: Decimal,
        kind: InventoryEventKind,
        occurredAt: Date = .now,
        purchaseDate: Date? = nil,
        shelfLifeDays: Int? = nil,
        batchID: UUID? = nil
    ) {
        self.id = id
        self.ingredientName = ingredientName
        self.unit = unit
        self.quantity = quantity
        self.kind = kind
        self.occurredAt = occurredAt
        self.purchaseDate = purchaseDate
        self.shelfLifeDays = shelfLifeDays
        self.batchID = batchID
    }

    public var expiresAt: Date? {
        guard let purchaseDate, let shelfLifeDays else { return nil }
        return Calendar.current.date(byAdding: .day, value: shelfLifeDays, to: purchaseDate)
    }
}

public struct InventoryBalance: Codable, Hashable, Sendable, Identifiable {
    public let id: String
    public let ingredientName: String
    public let unit: String
    public let quantity: Decimal
}

public enum InventoryLedger {
    public static func balances(from events: [InventoryEvent]) -> [InventoryBalance] {
        var totals: [IngredientKey: Decimal] = [:]
        var names: [IngredientKey: String] = [:]
        for event in events {
            let key = IngredientKey(name: event.ingredientName, unit: event.unit)
            let delta = event.kind == .consumed ? -event.quantity : event.quantity
            totals[key, default: 0] += delta
            names[key] = event.ingredientName.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return totals.map { key, quantity in
            InventoryBalance(
                id: "\(key.name)|\(key.unit)",
                ingredientName: names[key] ?? key.name,
                unit: key.unit,
                quantity: quantity
            )
        }
        .sorted { $0.ingredientName.localizedStandardCompare($1.ingredientName) == .orderedAscending }
    }
}
