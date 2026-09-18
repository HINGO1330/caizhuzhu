import Social
import UniformTypeIdentifiers

final class ShareViewController: SLComposeServiceViewController {
    override func isContentValid() -> Bool { true }

    override func didSelectPost() {
        Task {
            do {
                try await saveSharedContent()
                extensionContext?.completeRequest(returningItems: nil)
            } catch {
                extensionContext?.cancelRequest(withError: error)
            }
        }
    }

    override func configurationItems() -> [Any]! { [] }

    private func saveSharedContent() async throws {
        let providers = extensionContext?.inputItems
            .compactMap { $0 as? NSExtensionItem }
            .flatMap { $0.attachments ?? [] } ?? []

        var textParts: [String] = []
        var images: [Data] = []
        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier),
               let data = try await provider.data(for: UTType.image.identifier) {
                images.append(data)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
                      let item = try await provider.item(for: UTType.url.identifier) as? URL {
                textParts.append(item.absoluteString)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                      let item = try await provider.item(for: UTType.plainText.identifier) as? String {
                textParts.append(item)
            }
        }

        if !images.isEmpty {
            let names = images.indices.map { "\(UUID().uuidString)-\($0).image" }
            try SharedImportInbox.write(
                SharedImportEnvelope(kind: .images, imageFileNames: names),
                images: images
            )
        } else if let text = textParts.first {
            let kind: SharedImportEnvelope.Kind = URL(string: text)?.scheme?.hasPrefix("http") == true ? .url : .text
            try SharedImportInbox.write(SharedImportEnvelope(kind: kind, text: text))
        }
    }
}

private extension NSItemProvider {
    func item(for typeIdentifier: String) async throws -> NSSecureCoding? {
        try await withCheckedThrowingContinuation { continuation in
            loadItem(forTypeIdentifier: typeIdentifier, options: nil) { item, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: item) }
            }
        }
    }

    func data(for typeIdentifier: String) async throws -> Data? {
        if let data = try await item(for: typeIdentifier) as? Data { return data }
        if let url = try await item(for: typeIdentifier) as? URL { return try Data(contentsOf: url) }
        return nil
    }
}
