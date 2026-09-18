# 菜猪猪 MVP 架构

## 目标

菜猪猪是一款离线优先的 iPhone 家庭厨房管理应用。当前 MVP 聚焦菜谱分类、今日菜单、采购联动和库存事件；内容导入暂时下线，后续再恢复。核心业务规则放在纯 Swift Package `KitchenCore` 中；SwiftUI、SwiftData 和 App Intents 只负责平台适配。

## 模块边界

- `Packages/KitchenCore`：菜谱、采购清单、统一单位、库存事件及纯 Swift 服务。
- `App`：SwiftUI 导航、SwiftData 持久化和各功能页面。
- `ShareExtension`：接收 URL、文本和一张或多张图片，写入 App Group 待确认草稿。
- `AppIntents`：新建导入、查看采购清单和开始烹饪入口。
- `Server`：Python 标准库实现的导入解析 HTTP API。
- `Docs`：契约、验证边界和 macOS/Xcode 清单。

## 数据流

今日菜单记录菜谱与菜单项的关系，并保存用户选择的可为小数的目标份量；采购数量按食材比例计算后向上取整。移除菜单项会同步清理对应采购项。食材显示单位先经过别名规范化（如“颗/枚/粒”统一为“个”），无法安全换算的包装单位不强行合并。库存余额只通过事件求和；入库事件保存采购日期、保质期和到期时间，消耗默认选择最近到期批次，撤销通过反向事件保留审计轨迹。菜谱步骤输入支持本地规则拆分，标签由内置分类和可复用自定义标签组成。

## 状态与依赖

界面局部状态使用 `@State` / `@Binding`。共享持久化使用根部安装的 SwiftData `ModelContainer`；功能级服务优先构造器注入，不使用业务单例。

## 当前主机验证边界

Windows 主机未安装 Swift 工具链，因此 Swift Package、Xcode 工程、Share Extension 和 App Intents 均需在 macOS/Xcode 补充构建验证。Python 标准库 API 可在当前主机执行自动化测试。
