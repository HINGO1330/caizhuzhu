# 智能整理步骤：Cloudflare Worker 配置

本功能采用“本地拆分预览优先、用户主动调用 AI 兜底”的模式。前端代码不保存 OpenAI API key。

## 已完成的本地功能

1. 在新建或编辑菜谱的“步骤”区域粘贴原文。
2. 点击“预览步骤”，查看免费的本地拆分结果。
3. 仅当本地结果不满意时，点击“智能整理”。
4. AI 结果仍是预览，必须点击“采用此结果”才会写回编辑框；保存菜谱前还可以继续修改。

在 Worker 尚未部署前，点击“智能整理”只会提示服务未配置，不会发送菜谱文字。

## 安全模型

```text
浏览器（Supabase 登录会话）
  -> Cloudflare Worker（验证会话、限制每日次数）
    -> OpenAI Responses API（store: false）
```

- Worker 只接受 `https://hingo1330.github.io` 发起的请求。
- Worker 使用 Supabase `/auth/v1/user` 检查共享账号会话；未登录请求不触达 OpenAI。
- 原文限制 3,000 字；默认共享账号每天最多 10 次。
- Worker 强制结构化 JSON 输出，且提示词禁止编造食材、用量、时间和温度。
- API key 必须放在 Cloudflare **Secret**，绝不能提交到 GitHub、写入 `WebPreview` 或发到聊天中。

## 需要你完成的一次性配置

### 1. 创建 Cloudflare Worker 与 KV

1. 注册或登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages**，创建一个 Worker，名称建议为 `caizhuzhu-ai-step-organizer`。
3. 在 **Workers & Pages > KV** 创建 Namespace，名称建议为 `caizhuzhu-ai-usage`。
4. 回到 Worker 的 **Settings > Bindings**，添加 KV Namespace binding：
   - Variable name：`AI_USAGE`
   - KV namespace：选择 `caizhuzhu-ai-usage`
5. 将 [Worker 源码](../Workers/ai-step-organizer/src/worker.js) 部署到该 Worker。

### 2. 配置 Worker Variables 与 Secrets

在 Worker 的 **Settings > Variables and Secrets** 配置：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | Text | `https://hingo1330.github.io` |
| `SUPABASE_URL` | Text | `https://fajyyyokeclebzuhoowz.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Text | 现有 Supabase publishable key |
| `OPENAI_MODEL` | Text | 你在 OpenAI API 后台选择的低成本文本模型名称 |
| `DAILY_LIMIT` | Text | `10` |
| `OPENAI_API_KEY` | **Secret** | 你的 OpenAI API key |

`OPENAI_API_KEY` 必须选 Secret，不要选普通 Text variable。Cloudflare 会在保存后隐藏 Secret 的值。

### 3. 创建 OpenAI API key

1. 登录 [OpenAI API Platform](https://platform.openai.com/) 并按该平台要求开通 API 计费。
2. 创建一个仅用于菜猪猪的 API key。
3. 为该项目设置低额度预算/告警；菜猪猪本身还有每日 10 次限制。
4. 将 key 直接粘贴到 Cloudflare 的 `OPENAI_API_KEY` Secret 输入框，不要发送给任何人。

### 4. 提供 Worker 地址

部署后 Cloudflare 会提供类似下面的 URL：

```text
https://caizhuzhu-ai-step-organizer.<你的子域>.workers.dev
```

把这个**公开 Worker 地址**发给开发者即可；它不是密钥。随后将其写入 `WebPreview/src/ai-config.js` 的 `endpoint`，并在末尾补上 `/organize-steps`，例如：

```js
endpoint: "https://caizhuzhu-ai-step-organizer.example.workers.dev/organize-steps",
```

## 发布前验证

1. 在菜猪猪中登录共享账号。
2. 新建菜谱，粘贴一段杂乱步骤文字。
3. 点击“预览步骤”，确认本地结果显示但尚未改写原文。
4. 点击“智能整理”，确认得到“智能整理预览”。
5. 点击“采用此结果”，确认文本框才发生变化；最后手动保存菜谱。
6. 在 Cloudflare Worker 日志中确认没有输出 OpenAI key 或原始菜谱正文。

## 费用与故障处理

- Cloudflare Worker 的中转请求可落在免费层额度内，但 OpenAI API 调用按模型和 token 计费；以 OpenAI 账户的实际用量为准。
- 每日次数限制是防误用的第一层控制，不等同于绝对财务上限；必须同时在 OpenAI 平台设置预算/告警。
- Worker 或 OpenAI 故障时，本地拆分预览仍可使用，且不会影响菜谱保存。
