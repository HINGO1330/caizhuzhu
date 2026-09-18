import Foundation

enum SharedImportConstants {
    static let appGroupIdentifier = "group.com.caizhuzhu.shared"
    static let inboxDirectoryName = "PendingImports"
}

struct SharedImportEnvelope: Codable, Sendable, Identifiable {
    enum Kind: String, Codable, Sendable {
        case url
        case text
        case images
    }

    let id: UUID
    let kind: Kind
    let text: String?
    let imageFileNames: [String]
    let createdAt: Date

    init(
        id: UUID = UUID(),
        kind: Kind,
        text: String? = nil,
        imageFileNames: [String] = [],
        createdAt: Date = .now
    ) {
        self.id = id
        self.kind = kind
        self.text = text
        self.imageFileNames = imageFileNames
        self.createdAt = createdAt
    }
}

enum SharedImportInbox {
    static func write(_ envelope: SharedImportEnvelope, images: [Data] = []) throws {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedImportConstants.appGroupIdentifier
        ) else {
            throw CocoaError(.fileNoSuchFile)
        }
        let inbox = container.appending(path: SharedImportConstants.inboxDirectoryName, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)
        for (index, data) in images.enumerated() {
            try data.write(to: inbox.appending(path: envelope.imageFileNames[index]), options: .atomic)
        }
        let encoded = try JSONEncoder().encode(envelope)
        try encoded.write(to: inbox.appending(path: "\(envelope.id.uuidString).json"), options: .atomic)
    }

    static func pending() throws -> [(SharedImportEnvelope, [Data])] {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedImportConstants.appGroupIdentifier
        ) else {
            throw CocoaError(.fileNoSuchFile)
        }
        let inbox = container.appending(path: SharedImportConstants.inboxDirectoryName, directoryHint: .isDirectory)
        guard FileManager.default.fileExists(atPath: inbox.path()) else { return [] }
        return try FileManager.default.contentsOfDirectory(
            at: inbox,
            includingPropertiesForKeys: nil
        )
        .filter { $0.pathExtension == "json" }
        .compactMap { url in
            let envelope = try JSONDecoder().decode(SharedImportEnvelope.self, from: Data(contentsOf: url))
            let images = try envelope.imageFileNames.map { try Data(contentsOf: inbox.appending(path: $0)) }
            return (envelope, images)
        }
    }

    static func remove(_ envelope: SharedImportEnvelope) throws {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedImportConstants.appGroupIdentifier
        ) else { return }
        let inbox = container.appending(path: SharedImportConstants.inboxDirectoryName, directoryHint: .isDirectory)
        for name in envelope.imageFileNames {
            try? FileManager.default.removeItem(at: inbox.appending(path: name))
        }
        try? FileManager.default.removeItem(at: inbox.appending(path: "\(envelope.id.uuidString).json"))
    }
}
