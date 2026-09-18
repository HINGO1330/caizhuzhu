# 菜猪猪 PWA 发布清单

## 发布前确认

- 菜猪猪以 PWA（可安装的网站应用）发布，不会出现在 App Store 或 Google Play。
- 菜谱、采购和库存数据默认只保存在用户当前设备的浏览器中；不会在设备间同步。
- 公开链接意味着任何拿到链接的人都能打开应用。免费 GitHub Pages 通常同时会公开源代码；不要提交密码、App Secret、真实用户备份或私人照片。

## 首次发布

1. 注册或登录 GitHub。
2. 在 GitHub 新建一个公开仓库，例如 `caizhuzhu`。不要勾选自动创建 README、`.gitignore` 或许可证，避免与本地文件冲突。
3. 将当前项目推送到 GitHub 的 `main` 分支。根目录已包含 `.github/workflows/deploy-web-preview.yml`，它会在推送时运行 WebPreview 测试，然后发布 `WebPreview` 目录。
4. 打开 GitHub 仓库的 **Settings → Pages**，把 **Build and deployment → Source** 选为 **GitHub Actions**。
5. 打开 **Actions**，等待“发布菜猪猪 PWA”工作流变绿。点击运行记录中的部署链接，它通常形如 `https://你的用户名.github.io/仓库名/`。
6. 用该 HTTPS 链接在手机上验证：创建菜谱、加入今日菜单、采购入库、库存扣减、导出备份、断网后重开。

## 用户安装方式

- iPhone：使用 Safari 打开链接 → 分享 → 添加到主屏幕 → 打开“作为 Web App 打开” → 添加。
- Android：使用 Chrome 打开链接 → 浏览器菜单 → 安装应用，或添加到主屏幕。

## 更新方式

后续将修改推送到 `main` 分支即可自动重新发布。用户已经访问过的网站会在下次联网刷新时获取新版本；如果界面未更新，可在浏览器中刷新一次。

## 数据安全提醒

离线优先意味着数据会存放在设备浏览器里。用户应在“••• → 数据与演示 → 导出 JSON”定期备份；清除浏览器站点数据、换设备或使用不同浏览器都不会自动带走原数据。
