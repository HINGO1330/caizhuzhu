import Foundation

public protocol RecipeStore: Sendable {
    func recipes() async throws -> [Recipe]
    func recipe(id: UUID) async throws -> Recipe?
    func create(_ recipe: Recipe) async throws
    func update(_ recipe: Recipe) async throws
    func delete(id: UUID) async throws
}

public actor InMemoryRecipeStore: RecipeStore {
    private var storage: [UUID: Recipe] = [:]

    public init() {}

    public func recipes() -> [Recipe] {
        storage.values.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    public func recipe(id: UUID) -> Recipe? {
        storage[id]
    }

    public func create(_ recipe: Recipe) throws {
        try validate(recipe)
        guard storage[recipe.id] == nil else { throw RecipeError.duplicateID }
        storage[recipe.id] = recipe
    }

    public func update(_ recipe: Recipe) throws {
        try validate(recipe)
        guard storage[recipe.id] != nil else { throw RecipeError.notFound }
        storage[recipe.id] = recipe
    }

    public func delete(id: UUID) throws {
        guard storage.removeValue(forKey: id) != nil else { throw RecipeError.notFound }
    }

    private func validate(_ recipe: Recipe) throws {
        guard !recipe.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw RecipeError.invalidName
        }
    }
}
