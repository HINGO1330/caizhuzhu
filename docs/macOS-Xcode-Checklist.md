# macOS / Xcode 验证清单

当前 Windows 主机未安装 Swift 或 Xcode。以下项目尚未验证，不能视为已通过：

- [ ] 使用 Swift 6 执行 `swift test --package-path Packages/KitchenCore`。
- [ ] 使用当前稳定版 Xcode 打开/建立 iOS App 工程并链接 `KitchenCore`。
- [ ] 为两个 target 选择开发团队，并注册 `group.com.caizhuzhu.shared` App Group；如修改标识，同时修改两个 entitlements 和 `SharedImportConstants`。
- [ ] 确认最低部署版本为 iOS 17，SwiftUI 与 SwiftData 编译无警告。
- [ ] 在 Simulator 验证菜谱新增、查看、编辑、删除及重启后的持久化。
- [ ] 验证文本、URL、单图、多图及长截图均先进入人工确认页。
- [ ] 验证烹饪模式的上一项、下一项、当前步骤及关联食材。
- [ ] 验证从菜谱生成采购项、手动增删、勾选与数量调整。
- [ ] 验证库存事件追加后余额由事件重新汇总。
- [ ] 配置相同 App Group entitlement，验证 Share Extension 到主 App 的草稿交接。
- [ ] 验证“新建导入”“查看采购清单”“开始烹饪”三个 App Intent。
- [ ] 在断网环境重复核心流程，确认不依赖解析 API。
- [ ] 使用真机检查图片内存占用、隐私权限文案和 Share Extension 大图行为。
