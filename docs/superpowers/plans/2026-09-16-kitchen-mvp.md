# 菜猪猪 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付离线优先的家庭厨房管理 MVP 源码、纯 Swift 业务核心、原生 iOS 外壳及零依赖导入 API。

**Architecture:** 纯 Swift `KitchenCore` 承担领域规则，SwiftUI/SwiftData 提供平台界面和持久化，扩展通过 App Group 交换待确认草稿。Python 标准库 API 提供可选解析能力，客户端不依赖它完成核心流程。

**Tech Stack:** Swift 6、SwiftUI、SwiftData、App Intents、Share Extension、Python 3 标准库、unittest

**Spec:** `docs/superpowers/specs/2026-09-16-kitchen-mvp-design.md`

## Global Constraints

- iPhone 原生应用，SwiftUI + SwiftData。
- 离线优先；核心流程不得强依赖网络。
- 第三方依赖为零。
- 导入结果必须人工确认后保存。
- 当前 Windows 主机不得宣称 Xcode、Simulator、Extension 或 App Intent 构建成功。

---

### Task 1: 零依赖导入 API

**Files:** `Server/tests/test_api.py`, `Server/kitchen_api.py`, `Docs/API.md`

**Interfaces:** `POST /v1/import/parse` 接收 JSON；`parse_import(payload) -> dict` 返回候选菜谱或结构化错误。

- [x] 先写缺少解析器时失败的 unittest。
- [x] 运行测试并确认因功能缺失失败。
- [x] 实现文本与链接候选解析、HTTP 路由和错误映射。
- [x] 运行完整 Python 测试。

### Task 2: KitchenCore 领域与 CRUD

**Files:** `Packages/KitchenCore/Package.swift`, `Sources/KitchenCore/*.swift`, `Tests/KitchenCoreTests/*.swift`

**Interfaces:** `Recipe`, `Ingredient`, `RecipeStep`, `RecipeStore`, `InMemoryRecipeStore`。

- [x] 写菜谱验证和 CRUD 测试。
- [ ] 在 macOS 运行红测；Windows 只记录不可执行原因。
- [x] 实现最小领域模型和内存仓库。
- [ ] 在 macOS 运行 Swift 全量测试。

### Task 3: 导入确认状态机

**Files:** `Sources/KitchenCore/ImportDraft.swift`, `Tests/KitchenCoreTests/ImportDraftTests.swift`

**Interfaces:** 草稿状态为 `pending`, `confirmed`, `discarded`；仅 `pending` 可确认或丢弃。

- [x] 写非法状态转换与确认生成菜谱测试。
- [ ] 验证红测。
- [x] 实现状态机和错误类型。
- [ ] 验证全量测试。

### Task 4: 采购与库存规则

**Files:** `Sources/KitchenCore/Shopping.swift`, `Inventory.swift`, 对应测试文件。

**Interfaces:** 菜谱食材生成可编辑采购项；`InventoryLedger.balance` 汇总入库、消耗、调整事件。

- [ ] 分别写采购合并与库存汇总失败测试。
- [ ] 验证红测。
- [ ] 实现最小规则。
- [ ] 验证全量测试。

### Task 5: SwiftUI/SwiftData 应用外壳

**Files:** `App/Sources/**/*.swift`

**Interfaces:** 根 `TabView` 提供菜谱、采购、库存；依赖从根部注入，编辑使用 enum 驱动 sheet。

- [ ] 建立 SwiftData 仓库契约测试或 KitchenCore 适配测试。
- [x] 实现应用入口、导航、CRUD、导入确认和烹饪模式页面。
- [ ] 在 macOS/Xcode 构建并执行交互验证。

### Task 6: 系统集成

**Files:** `ShareExtension/**/*.swift`, `AppIntents/**/*.swift`

**Interfaces:** App Group 保存待确认导入载荷；Intents 提供新建导入、查看采购、开始烹饪入口。

- [ ] 写载荷编码/解码纯 Swift 测试。
- [x] 实现扩展和 Intents 适配层。
- [ ] 在真机或 Simulator 验证分享与快捷指令。

### Task 7: 总体验证

**Files:** `Docs/macOS-Xcode-Checklist.md`, `README.md`

- [ ] 运行当前环境全部 Python 测试和静态检查。
- [ ] 在可用时运行 `swift test`。
- [ ] 检查 Git 状态，列出真实通过项和 macOS 待验证项。
