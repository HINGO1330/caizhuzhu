import KitchenCore
import SwiftData
import SwiftUI

private enum InventoryEditorDestination: String, Identifiable {
    case stocked, consumed, adjusted
    var id: String { rawValue }
    var kind: InventoryEventKind { InventoryEventKind(rawValue: rawValue)! }
}

struct InventoryView: View {
    @Query(sort: \InventoryEventRecord.occurredAt, order: .reverse) private var records: [InventoryEventRecord]
    @State private var editor: InventoryEditorDestination?

    private var balances: [InventoryBalance] {
        InventoryLedger.balances(from: records.map(\.event))
    }

    var body: some View {
        List {
            Section("当前库存") {
                if balances.isEmpty {
                    Text("添加入库事件后显示余额").foregroundStyle(.secondary)
                }
                ForEach(balances) { balance in
                    LabeledContent(balance.ingredientName, value: "\(NSDecimalNumber(decimal: balance.quantity).stringValue) \(balance.unit)")
                }
            }
            Section("最近事件") {
                ForEach(records) { record in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(record.ingredientName)
                            Text(record.occurredAt, style: .date).font(.caption).foregroundStyle(.secondary)
                            if let expiresAt = record.event.expiresAt {
                                Text(expiresAt, style: .relative).font(.caption2).foregroundStyle(.orange)
                            }
                        }
                        Spacer()
                        Text("\(record.kindRawValue == "consumed" ? "−" : "+")\(record.quantityText) \(record.unit)")
                    }
                }
            }
        }
        .navigationTitle("库存")
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button("入库") { editor = .stocked }
                Button("消耗") { editor = .consumed }
                Button("调整") { editor = .adjusted }
            }
        }
        .sheet(item: $editor) { destination in
            InventoryEventEditor(kind: destination.kind)
        }
    }
}

private struct InventoryEventEditor: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    let kind: InventoryEventKind
    @State private var name = ""
    @State private var quantity = ""
    @State private var unit = ""
    @State private var purchaseDate = Date()
    @State private var shelfLifeDays = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("食材", text: $name)
                TextField("数量", text: $quantity).keyboardType(.decimalPad)
                TextField("单位", text: $unit)
                if kind == .stocked {
                    DatePicker("采购日期", selection: $purchaseDate, displayedComponents: .date)
                    TextField("保质期（天）", text: $shelfLifeDays).keyboardType(.numberPad)
                }
            }
            .navigationTitle(kind == .stocked ? "记录入库" : kind == .consumed ? "记录消耗" : "调整库存")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        let event = InventoryEvent(
                            ingredientName: name,
                            unit: unit,
                            quantity: Decimal(string: quantity) ?? 0,
                            kind: kind,
                            purchaseDate: kind == .stocked ? purchaseDate : nil,
                            shelfLifeDays: kind == .stocked ? Int(shelfLifeDays) : nil,
                            batchID: kind == .stocked ? UUID() : nil
                        )
                        modelContext.insert(InventoryEventRecord(event: event))
                        dismiss()
                    }
                    .disabled(name.isEmpty || Decimal(string: quantity) == nil || (kind == .stocked && Int(shelfLifeDays) == nil))
                }
            }
        }
    }
}
