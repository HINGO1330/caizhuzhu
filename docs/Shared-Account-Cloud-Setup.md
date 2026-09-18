# 菜猪猪共享账号云备份配置

本项目采用一个共享邮箱账号：两台设备登录相同邮箱与密码，即共享同一份菜谱、今日菜单、采购清单与库存数据。

## 已配置的公开客户端信息

- Project URL：`https://fajyyyokeclebzuhoowz.supabase.co`
- 使用 publishable key；它用于浏览器客户端，不具备管理员权限。

不要将 Supabase 的 `service_role` key 放到 GitHub、网页代码或聊天中。

## 一次性后台配置

1. 在 Supabase Dashboard 打开该项目的 **SQL Editor**。
2. 新建查询，将 [shared-account-schema.sql](../Server/supabase/shared-account-schema.sql) 的完整内容粘贴并执行。
3. 在 **Authentication > Providers > Email** 保持 Email provider 开启。
4. 在 **Authentication > URL Configuration** 加入：
   - `https://hingo1330.github.io/caizhuzhu/`
   - 本地预览地址（如果需要），例如 `http://localhost:4173`
5. 在 **Authentication > Users** 创建一个共享邮箱用户，设置一条只由两人知晓、至少 12 位的密码。

## 同步规则

- 新设备首次登录时：如果云端已有数据，网页会恢复云端版本并覆盖该设备本地数据。
- 首次登录的设备：云端无数据时，网页会把该设备的当前状态上传为第一份云端备份。
- 登录后每一次资料修改都会同时保存在本机并尝试写入云端；离线失败时本机数据仍保留，后续操作会重试。
- 当前这一版优先同步结构化业务数据。菜谱图片仍在设备 IndexedDB 中，尚未纳入云端文件桶；在图片云备份完成前，请继续定期导出本地 JSON，并避免仅依赖云端恢复图片。

## 安全边界

数据库已使用 Row Level Security：发布到网页的 key 只能以已登录用户身份访问自己的 `app_states` 行。共享同一账号意味着两人拥有同样的数据访问权；这符合当前范围，但不具备个人操作追踪能力。
