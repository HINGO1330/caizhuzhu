import AppIntents
import Foundation

struct ViewShoppingListIntent: AppIntent {
    static let title: LocalizedStringResource = "查看菜猪猪采购清单"
    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "caizhuzhu://shopping")!))
    }
}

struct StartCookingIntent: AppIntent {
    static let title: LocalizedStringResource = "开始烹饪"
    @Parameter(title: "菜谱名称")
    var recipeName: String?

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "caizhuzhu://cooking")!))
    }
}

struct KitchenShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: ViewShoppingListIntent(), phrases: ["查看\(.applicationName)采购清单"])
        AppShortcut(intent: StartCookingIntent(), phrases: ["用\(.applicationName)开始烹饪"])
    }
}
