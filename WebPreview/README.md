# 菜猪猪 PWA

这是可安装、离线可用的家庭厨房管理网页应用，支持菜谱、今日菜单、采购和库存。数据只保存在每台设备的浏览器中；请在“••• → 数据与演示”定期导出 JSON 备份。

## 启动

在项目根目录打开 PowerShell：

```powershell
cd WebPreview
python -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

## 测试

```powershell
node --test tests/*.test.js
```

无需安装 npm 包。菜谱、草稿、采购项和库存事件保存在浏览器 localStorage；图片保存在 IndexedDB。右上角“•••”支持安装指引、导出 JSON、导入 JSON 和重置演示数据。

首次联网打开后，静态资源会被 service worker 缓存，可以离线再次打开。更换浏览器或清除浏览器站点数据会创建一份新的演示数据。

## 发布到 GitHub Pages

1. 在 GitHub 创建一个新仓库。免费 Pages 会公开仓库内容，不要放入密码、App Secret 或真实用户资料。
2. 将本项目推送到该仓库的 `main` 分支。
3. 在仓库 **Settings → Pages** 中，将来源设为 **GitHub Actions**。
4. 推送后，工作流会先运行测试，再发布 `WebPreview` 目录。完成后，在 Actions 的“发布菜猪猪 PWA”运行记录中取得公开 HTTPS 链接。
5. 用 iPhone Safari 打开该链接，点分享 → 添加到主屏幕；安卓用 Chrome 菜单选择安装应用或添加到主屏幕。
