import SwiftData
import SwiftUI

@main
struct CaiZhuZhuApp: App {
    private let container: ModelContainer = {
        do {
            return try ModelContainer(
                for: RecipeRecord.self,
                ShoppingItemRecord.self,
                TodayMenuRecord.self,
                InventoryEventRecord.self,
                ImportDraftRecord.self
            )
        } catch {
            fatalError("无法创建本地数据库：\(error.localizedDescription)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}
