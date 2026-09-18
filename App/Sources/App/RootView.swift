import SwiftUI
import SwiftData

enum AppTab: Hashable {
    case recipes
    case shopping
    case inventory
}

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var selectedTab: AppTab = .recipes

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack { RecipeListView() }
                .tabItem { Label("菜谱", systemImage: "book.pages") }
                .tag(AppTab.recipes)
            NavigationStack { ShoppingListView() }
                .tabItem { Label("采购", systemImage: "cart") }
                .tag(AppTab.shopping)
            NavigationStack { InventoryView() }
                .tabItem { Label("库存", systemImage: "shippingbox") }
                .tag(AppTab.inventory)
        }
        .onOpenURL { url in
            guard url.scheme == "caizhuzhu" else { return }
            switch url.host {
            case "shopping": selectedTab = .shopping
            case "cooking": selectedTab = .recipes
            default: break
            }
        }
    }
}
