import KitchenCore
import SwiftData

@MainActor
enum SharedImportCoordinator {
    static func ingestPendingImports(into context: ModelContext) {
        guard let pending = try? SharedImportInbox.pending() else { return }
        for (envelope, images) in pending {
            do {
                let draft: ImportDraft
                switch envelope.kind {
                case .url:
                    let text = envelope.text ?? ""
                    draft = ImportDraft(source: .url(text), candidate: Recipe(name: URL(string: text)?.host ?? "链接导入", source: text))
                case .text:
                    let text = envelope.text ?? ""
                    draft = ImportDraft(source: .text(text), candidate: Recipe(name: text.split(separator: "\n").first.map(String.init) ?? "文案导入"))
                case .images:
                    let references = try images.map(ImageImportStore.save)
                    draft = ImportDraft(
                        source: .images(references),
                        candidate: Recipe(
                            name: references.count == 1 ? "图片导入" : "多图导入",
                            imageReferences: references
                        )
                    )
                }
                context.insert(ImportDraftRecord(draft: draft))
                try context.save()
                try SharedImportInbox.remove(envelope)
            } catch {
                continue
            }
        }
    }
}
