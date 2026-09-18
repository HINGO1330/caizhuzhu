import KitchenCore
import PhotosUI
import SwiftData
import SwiftUI

private enum NewImportDestination: String, Identifiable {
    case text, url
    var id: String { rawValue }
}

struct ImportInboxView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ImportDraftRecord.createdAt, order: .reverse) private var drafts: [ImportDraftRecord]
    @State private var destination: NewImportDestination?
    @State private var selectedPhotos: [PhotosPickerItem] = []

    var body: some View {
        List {
            Section("新建导入") {
                Button("粘贴文案") { destination = .text }
                Button("粘贴链接") { destination = .url }
                PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 20, matching: .images) {
                    Label("选择图片或长截图", systemImage: "photo.on.rectangle.angled")
                }
            }
            Section("待确认") {
                ForEach(drafts.filter { $0.statusRawValue == ImportDraftStatus.pending.rawValue }) { draft in
                    NavigationLink {
                        ImportConfirmationView(record: draft)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(draft.candidate.name)
                            Text(draft.createdAt, style: .relative)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("导入")
        .sheet(item: $destination) { destination in
            TextImportView(kind: destination)
        }
        .onChange(of: selectedPhotos) { _, photos in
            guard !photos.isEmpty else { return }
            Task { await importPhotos(photos) }
        }
    }

    @MainActor
    private func importPhotos(_ photos: [PhotosPickerItem]) async {
        var references: [String] = []
        for photo in photos {
            guard let data = try? await photo.loadTransferable(type: Data.self),
                  let reference = try? ImageImportStore.save(data) else { continue }
            references.append(reference)
        }
        if !references.isEmpty {
            let draft = ImportDraft(
                source: .images(references),
                candidate: Recipe(
                    name: references.count == 1 ? "图片导入" : "多图导入",
                    imageReferences: references
                )
            )
            modelContext.insert(ImportDraftRecord(draft: draft))
        }
        selectedPhotos = []
    }
}

private struct TextImportView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    let kind: NewImportDestination
    @State private var content = ""

    var body: some View {
        NavigationStack {
            Form {
                TextEditor(text: $content).frame(minHeight: 220)
            }
            .navigationTitle(kind == .url ? "导入链接" : "导入文案")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("进入确认") {
                        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
                        let title = kind == .url
                            ? URL(string: trimmed)?.host ?? "链接导入"
                            : trimmed.split(separator: "\n").first.map(String.init) ?? "文案导入"
                        let source: ImportSource = kind == .url ? .url(trimmed) : .text(trimmed)
                        modelContext.insert(ImportDraftRecord(draft: ImportDraft(source: source, candidate: Recipe(name: title, source: kind == .url ? trimmed : nil))))
                        dismiss()
                    }
                    .disabled(content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct ImportConfirmationView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    let record: ImportDraftRecord
    @State private var name: String
    @State private var summaryText: String
    @State private var ingredientsText: String
    @State private var stepsText: String

    init(record: ImportDraftRecord) {
        self.record = record
        let recipe = record.candidate
        _name = State(initialValue: recipe.name)
        _summaryText = State(initialValue: recipe.summary)
        _ingredientsText = State(initialValue: recipe.ingredients.map {
            "\($0.name) | \(NSDecimalNumber(decimal: $0.quantity).stringValue) | \($0.unit)"
        }.joined(separator: "\n"))
        _stepsText = State(initialValue: recipe.steps.map(\.instruction).joined(separator: "\n"))
    }

    var body: some View {
        Form {
            Section("保存前请确认并修改") {
                TextField("名称", text: $name)
                TextField("简介", text: $summaryText, axis: .vertical)
            }
            Section("食材（名称 | 数量 | 单位）") {
                TextEditor(text: $ingredientsText).frame(minHeight: 120)
            }
            Section("步骤（每行一步）") {
                TextEditor(text: $stepsText).frame(minHeight: 160)
            }
            Button("确认并保存菜谱", action: confirm)
                .buttonStyle(.borderedProminent)
                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            Button("丢弃草稿", role: .destructive) {
                record.statusRawValue = ImportDraftStatus.discarded.rawValue
                dismiss()
            }
        }
        .navigationTitle("确认导入")
    }

    private func confirm() {
        let ingredients = ingredientsText.split(separator: "\n").compactMap { line -> Ingredient? in
            let parts = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
            guard parts.count == 3, let quantity = Decimal(string: parts[1]) else { return nil }
            return Ingredient(name: parts[0], quantity: quantity, unit: parts[2])
        }
        let steps = stepsText.split(separator: "\n").map { RecipeStep(instruction: $0.trimmingCharacters(in: .whitespaces)) }
        var recipe = record.candidate
        recipe.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        recipe.summary = summaryText
        recipe.ingredients = ingredients
        recipe.steps = steps
        modelContext.insert(RecipeRecord(recipe: recipe))
        record.statusRawValue = ImportDraftStatus.confirmed.rawValue
        try? modelContext.save()
        dismiss()
    }
}

enum ImageImportStore {
    static func save(_ data: Data) throws -> String {
        let directory = URL.applicationSupportDirectory.appending(path: "ImportedImages", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let file = directory.appending(path: "\(UUID().uuidString).image")
        try data.write(to: file, options: .atomic)
        return file.path()
    }
}
