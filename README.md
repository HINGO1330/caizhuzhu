# 菜猪猪——家庭厨房管理软件

离线优先的 iPhone 家庭厨房管理 MVP。当前版本聚焦菜谱分类、今日菜单、采购联动和库存事件；内容导入暂时下线，后续再恢复。业务核心位于纯 Swift Package，iOS 层使用 SwiftUI、SwiftData 和 App Intents；浏览器预览可在 Windows 上验证主要流程。

## 当前可运行内容

```powershell
python -m unittest discover -s Server/tests -v
python -m Server.kitchen_api
```

服务默认监听 `http://127.0.0.1:8080`，接口见 `Docs/API.md`。

## Swift 核心

在安装 Swift 6 的环境中运行：

```sh
swift test --package-path Packages/KitchenCore
```

当前 Windows 主机没有 Swift 工具链。iOS 工程、Share Extension、App Intents 和 Simulator 的验证要求见 `Docs/macOS-Xcode-Checklist.md`。

## iOS 工程

在 macOS 上使用 Xcode 16 或更高版本打开 `CaiZhuZhu.xcodeproj`。工程包含主应用、Share Extension、本地 `KitchenCore` Package、App Intents 和共享容器代码。

首次构建前需要选择开发团队，并注册 `group.com.caizhuzhu.shared` App Group；主应用和分享扩展必须使用同一个标识。

## Windows 浏览器预览

没有 Mac 时，可使用 `WebPreview` 验证主要产品流程：

```powershell
cd WebPreview
python -m http.server 4173
```

访问 `http://127.0.0.1:4173/`。该预览零第三方依赖、离线可用，详细说明见 `WebPreview/README.md`。
