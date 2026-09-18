import KitchenCore
import SwiftUI

struct CookingView: View {
    let recipe: Recipe
    @State private var index = 0

    private var step: RecipeStep { recipe.steps[index] }
    private var ingredients: [Ingredient] {
        guard !step.ingredientIDs.isEmpty else { return recipe.ingredients }
        return recipe.ingredients.filter { step.ingredientIDs.contains($0.id) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("第 \(index + 1) 步，共 \(recipe.steps.count) 步")
                .font(.subheadline).foregroundStyle(.secondary)
            Text(step.instruction).font(.largeTitle.bold())
            if !ingredients.isEmpty {
                Divider()
                Text("本步食材").font(.headline)
                ForEach(ingredients) { ingredient in
                    Text("• \(ingredient.name) \(NSDecimalNumber(decimal: ingredient.quantity).stringValue) \(ingredient.unit)")
                }
            }
            Spacer()
            HStack {
                Button("上一项") { index -= 1 }.disabled(index == 0)
                Spacer()
                Button(index == recipe.steps.count - 1 ? "完成" : "下一项") {
                    if index < recipe.steps.count - 1 { index += 1 }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .navigationTitle(recipe.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
