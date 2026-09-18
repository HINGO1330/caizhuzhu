import Foundation

public struct Ingredient: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var name: String
    public var quantity: Decimal
    public var unit: String

    public init(id: UUID = UUID(), name: String, quantity: Decimal, unit: String) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = unit
    }
}

public struct RecipeStep: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var instruction: String
    public var ingredientIDs: [UUID]

    public init(id: UUID = UUID(), instruction: String, ingredientIDs: [UUID] = []) {
        self.id = id
        self.instruction = instruction
        self.ingredientIDs = ingredientIDs
    }
}

public struct Recipe: Codable, Hashable, Sendable, Identifiable {
    public var id: UUID
    public var name: String
    public var summary: String
    public var ingredients: [Ingredient]
    public var steps: [RecipeStep]
    public var servings: Int
    public var durationMinutes: Int?
    public var imageReferences: [String]
    public var tags: [String]
    public var source: String?

    public init(
        id: UUID = UUID(),
        name: String,
        summary: String = "",
        ingredients: [Ingredient] = [],
        steps: [RecipeStep] = [],
        servings: Int = 1,
        durationMinutes: Int? = nil,
        imageReferences: [String] = [],
        tags: [String] = [],
        source: String? = nil
    ) {
        self.id = id
        self.name = name
        self.summary = summary
        self.ingredients = ingredients
        self.steps = steps
        self.servings = servings
        self.durationMinutes = durationMinutes
        self.imageReferences = imageReferences
        self.tags = tags
        self.source = source
    }
}

public enum RecipeError: Error, Equatable, Sendable {
    case invalidName
    case duplicateID
    case notFound
}
