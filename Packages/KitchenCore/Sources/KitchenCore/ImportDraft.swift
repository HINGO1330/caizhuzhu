import Foundation

public enum ImportSource: Codable, Hashable, Sendable {
    case url(String)
    case text(String)
    case images([String])
}

public enum ImportDraftStatus: String, Codable, Hashable, Sendable {
    case pending
    case confirmed
    case discarded
}

public enum ImportDraftError: Error, Equatable, Sendable {
    case invalidTransition
}

public struct ImportDraft: Codable, Hashable, Sendable, Identifiable {
    public let id: UUID
    public let source: ImportSource
    public var candidate: Recipe
    public private(set) var status: ImportDraftStatus

    public init(
        id: UUID = UUID(),
        source: ImportSource,
        candidate: Recipe,
        status: ImportDraftStatus = .pending
    ) {
        self.id = id
        self.source = source
        self.candidate = candidate
        self.status = status
    }

    public mutating func confirm() throws -> Recipe {
        guard status == .pending else { throw ImportDraftError.invalidTransition }
        status = .confirmed
        return candidate
    }

    public mutating func discard() throws {
        guard status == .pending else { throw ImportDraftError.invalidTransition }
        status = .discarded
    }
}
