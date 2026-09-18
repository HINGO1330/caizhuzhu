import KitchenCore
import PhotosUI
import SwiftData
import SwiftUI
import UIKit

private enum RecipeEditorDestination: Identifiable {
    case create
    case edit(RecipeRecord)

    var id: String {
        switch self {
        case .create: "create"
        case .edit(let record): record.id.uuidString
        }
    }
}

struct RecipeListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \RecipeRecord.updatedAt, order: .reverse) private var recipes: [RecipeRecord]
    @Query(sort: \TodayMenuRecord.addedAt, order: .reverse) private var todayMenus: [TodayMenuRecord]
    @State private var editor: RecipeEditorDestination?

    var body: some View {
        Group {
            if recipes.isEmpty {
                ContentUnavailableView(
                    "还没有菜谱",
                    systemImage: "book.closed",
                    description: Text("新建菜谱并加入今日菜单。")
                )
            } else {
                List {
                    ForEach(recipes) { record in
                        NavigationLink {
                            RecipeDetailView(record: record)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(record.name).font(.headline)
                                if !record.summaryText.isEmpty {
                                    Text(record.summaryText)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                            }
                        }
                        .swipeActions {
                            Button("编辑") { editor = .edit(record) }
                                .tint(.blue)
                            Button("删除", role: .destructive) { modelContext.delete(record) }
                        }
                    }
                    Section("今日菜单") {
                        if todayMenus.isEmpty {
                            Text("从菜谱详情加入今天想做的菜").foregroundStyle(.secondary)
                        }
                        ForEach(todayMenus) { menu in
                            if let recipe = recipes.first(where: { $0.id == menu.recipeID }) {
                                HStack {
                                    Text(recipe.name)
                                    Spacer()
                                    Text("\(menu.servings) 人份").foregroundStyle(.secondary)
                                }
                            }
                        }
                        .onDelete { offsets in offsets.map { todayMenus[$0] }.forEach(modelContext.delete) }
                    }
                }
            }
        }
        .navigationTitle("菜谱")
        .toolbar {
            Button { editor = .create } label: {
                Label("新建菜谱", systemImage: "plus")
            }
        }
        .sheet(item: $editor) { destination in
            switch destination {
            case .create:
                RecipeEditorView()
            case .edit(let record):
                RecipeEditorView(record: record)
            }
        }
    }
}

struct RecipeDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var todayMenus: [TodayMenuRecord]
    let record: RecipeRecord
    @State private var editor: RecipeEditorDestination?

    private var recipe: Recipe { record.recipe }

    var body: some View {
        List {
            if let firstImage = recipe.imageReferences.first {
                LocalRecipeImage(path: firstImage)
                    .frame(maxWidth: .infinity)
                    .listRowInsets(EdgeInsets())
            }
            if !recipe.summary.isEmpty { Text(recipe.summary) }
            Section("信息") {
                LabeledContent("份量", value: "\(recipe.servings) 人份")
                if let duration = recipe.durationMinutes {
                    LabeledContent("耗时", value: "\(duration) 分钟")
                }
                if !recipe.tags.isEmpty {
                    LabeledContent("标签", value: recipe.tags.joined(separator: "、"))
                }
                if let source = recipe.source, !source.isEmpty {
                    LabeledContent("来源", value: source)
                }
            }
            Section("食材") {
                ForEach(recipe.ingredients) { ingredient in
                    LabeledContent(
                        ingredient.name,
                        value: "\(NSDecimalNumber(decimal: ingredient.quantity).stringValue) \(ingredient.unit)"
                    )
                }
            }
            Section("步骤") {
                ForEach(Array(recipe.steps.enumerated()), id: \.element.id) { index, step in
                    Text("\(index + 1). \(step.instruction)")
                }
            }
            if !recipe.steps.isEmpty {
                NavigationLink("开始烹饪") { CookingView(recipe: recipe) }
            }
        }
        .navigationTitle(recipe.name)
        .toolbar {
            Button("编辑") { editor = .edit(record) }
            Button(todayMenus.contains(where: { $0.recipeID == record.id }) ? "已加入今日菜单" : "加入今日菜单") {
                guard !todayMenus.contains(where: { $0.recipeID == record.id }) else { return }
                modelContext.insert(TodayMenuRecord(recipeID: record.id, servings: record.recipe.servings))
            }
            .disabled(todayMenus.contains(where: { $0.recipeID == record.id }))
        }
        .sheet(item: $editor) { destination in
            if case .edit(let record) = destination {
                RecipeEditorView(record: record)
            }
        }
    }
}

struct RecipeEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    private let record: RecipeRecord?
    private let recipeID: UUID

    @State private var name: String
    @State private var summaryText: String
    @State private var servings: Int
    @State private var tagsText: String
    @State private var ingredientLines: String
    @State private var stepLines: String
    @State private var imageReferences: [String]
    @State private var selectedPhotos: [PhotosPickerItem] = []

    init(record: RecipeRecord? = nil) {
        self.record = record
        let recipe = record?.recipe ?? Recipe(name: "")
        recipeID = recipe.id
        _name = State(initialValue: recipe.name)
        _summaryText = State(initialValue: recipe.summary)
        _servings = State(initialValue: 1)
        _tagsText = State(initialValue: recipe.tags.joined(separator: "、"))
        _ingredientLines = State(initialValue: recipe.ingredients.map {
            "\($0.name) | \(NSDecimalNumber(decimal: $0.quantity).stringValue) | \($0.unit)"
        }.joined(separator: "\n"))
        _stepLines = State(initialValue: recipe.steps.map(\.instruction).joined(separator: "\n"))
        _imageReferences = State(initialValue: recipe.imageReferences)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("基本信息") {
                    TextField("名称", text: $name)
                    TextField("简介", text: $summaryText, axis: .vertical)
                    TextField("标签（用顿号分隔）", text: $tagsText)
                }
                Section("图片") {
                    PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 20, matching: .images) {
                        Label("添加图片或长截图", systemImage: "photo.badge.plus")
                    }
                    if !imageReferences.isEmpty {
                        Text("已选择 \(imageReferences.count) 张图片").foregroundStyle(.secondary)
                        Button("移除全部图片", role: .destructive) { imageReferences = [] }
                    }
                }
                Section("食材（每行：名称 | 数量 | 单位）") {
                    TextEditor(text: $ingredientLines).frame(minHeight: 120)
                }
                Section("步骤（每行一步）") {
                    TextEditor(text: $stepLines).frame(minHeight: 160)
                }
            }
            .navigationTitle(record == nil ? "新建菜谱" : "编辑菜谱")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", action: save).disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onChange(of: selectedPhotos) { _, photos in
                Task { await importSelectedPhotos(photos) }
            }
        }
    }

    private func save() {
        let ingredients = ingredientLines.split(separator: "\n").compactMap { line -> Ingredient? in
            let parts = line.split(separator: "|", omittingEmptySubsequences: false).map {
                $0.trimmingCharacters(in: .whitespaces)
            }
            guard parts.count == 3, let quantity = Decimal(string: parts[1]), !parts[0].isEmpty else { return nil }
            return Ingredient(name: parts[0], quantity: quantity, unit: parts[2])
        }
        let steps = stepLines.split(separator: "\n").map {
            RecipeStep(instruction: $0.trimmingCharacters(in: .whitespaces))
        }.filter { !$0.instruction.isEmpty }
        let recipe = Recipe(
            id: recipeID,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            summary: summaryText,
            ingredients: ingredients,
            steps: steps,
            servings: servings,
            durationMinutes: nil,
            imageReferences: imageReferences,
            tags: tagsText.split(separator: "、").map(String.init),
            source: nil
        )
        if let record {
            record.replace(with: recipe)
        } else {
            modelContext.insert(RecipeRecord(recipe: recipe))
        }
        try? modelContext.save()
        dismiss()
    }

    @MainActor
    private func importSelectedPhotos(_ photos: [PhotosPickerItem]) async {
        for photo in photos {
            guard let data = try? await photo.loadTransferable(type: Data.self),
                  let reference = try? ImageImportStore.save(data) else { continue }
            imageReferences.append(reference)
        }
        selectedPhotos = []
    }
}

private struct LocalRecipeImage: View {
    let path: String

    var body: some View {
        Group {
            if let image = UIImage(contentsOfFile: path) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .accessibilityLabel("菜谱图片")
            } else {
                ContentUnavailableView("图片不可用", systemImage: "photo")
            }
        }
    }
}
