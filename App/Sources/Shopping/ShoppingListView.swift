import KitchenCore
import SwiftData
import SwiftUI

struct ShoppingListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ShoppingItemRecord.name) private var items: [ShoppingItemRecord]
    @Query(sort: \RecipeRecord.name) private var recipes: [RecipeRecord]
    @Query(sort: \TodayMenuRecord.addedAt, order: .reverse) private var todayMenus: [TodayMenuRecord]
    @State private var newName = ""

    var body: some View {
        List {
            Section("手动添加") {
                HStack {
                    TextField("采购项", text: $newName)
                    Button("添加", action: addManual).disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            Section("清单") {
                if !todayMenus.isEmpty {
                    Text("已根据今日菜单自动同步").font(.caption).foregroundStyle(.secondary)
                }
                ForEach(items) { item in
                    HStack {
                        Button { item.isChecked.toggle() } label: {
                            Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                        }
                        .buttonStyle(.plain)
                        Text(item.name).strikethrough(item.isChecked)
                        Spacer()
                        Button { adjust(item, by: -1) } label: { Image(systemName: "minus.circle") }
                        Text("\(item.quantityText) \(item.unit)").monospacedDigit()
                        Button { adjust(item, by: 1) } label: { Image(systemName: "plus.circle") }
                    }
                }
                .onDelete { offsets in offsets.map { items[$0] }.forEach(modelContext.delete) }
            }
        }
        .navigationTitle("采购清单")
        .task {
            syncTodayMenu()
        }
    }

    private func addManual() {
        modelContext.insert(ShoppingItemRecord(item: ShoppingItem(name: newName.trimmingCharacters(in: .whitespaces), quantity: 1, unit: "")))
        newName = ""
    }

    private func add(recipe: Recipe, menuID: UUID) {
        ShoppingListGenerator.items(from: recipe, desiredServings: recipe.servings)
            .map { item in
                let record = ShoppingItemRecord(item: item)
                record.sourceMenuID = menuID
                return record
            }
            .forEach(modelContext.insert)
    }

    private func syncTodayMenu() {
        let active = Set(todayMenus.map(\.id))
        items.filter { $0.sourceMenuID != nil && !active.contains($0.sourceMenuID!) }
            .forEach(modelContext.delete)
        for menu in todayMenus where !items.contains(where: { $0.sourceMenuID == menu.id }) {
            guard let recipe = recipes.first(where: { $0.id == menu.recipeID })?.recipe else { continue }
            add(recipe: recipe, menuID: menu.id)
        }
    }

    private func adjust(_ item: ShoppingItemRecord, by amount: Decimal) {
        let current = Decimal(string: item.quantityText) ?? 0
        item.quantityText = NSDecimalNumber(decimal: max(0, current + amount)).stringValue
    }
}
