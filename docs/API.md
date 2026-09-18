# 导入解析 API 契约

## GET /healthz

服务就绪时返回 `200` 和 `{"status":"ok"}`。该接口只说明进程可响应，不代表外部网络或 OCR 能力可用。

## POST /v1/import/parse

所有成功结果均为候选草稿，`status` 固定为 `needs_confirmation`，且 `can_save_without_confirmation` 固定为 `false`。客户端不得绕过人工确认直接保存。

### 文本

```json
{"kind":"text","content":"番茄炒蛋\n番茄 2个\n1. 炒熟"}
```

首个非空行作为候选名称；形如“名称 数量单位”的行作为食材；以数字及 `.`、`、` 或 `)` 开头的行作为步骤。

### 链接

```json
{"kind":"url","content":"https://example.com/recipe"}
```

只接受 `http` 和 `https`。零依赖服务不会抓取网页，链接会作为来源保留并等待人工编辑。

### 单图与多图

```json
{
  "kind":"images",
  "images":[
    {"media_type":"image/jpeg","data_base64":"/9j/AA=="}
  ]
}
```

支持 `image/jpeg`、`image/png`、`image/heic`，每次最多 20 张。服务验证载荷并返回 SHA-256 引用，不回显图片数据。当前零依赖实现不做 OCR，返回 `ocr_unavailable` 警告；图片仍可进入客户端待确认流程。

### 成功响应

```json
{
  "status":"needs_confirmation",
  "can_save_without_confirmation":false,
  "recipe":{
    "name":"番茄炒蛋",
    "summary":"",
    "ingredients":[],
    "steps":[],
    "servings":null,
    "duration_minutes":null,
    "image_references":[],
    "tags":[],
    "source":null
  },
  "warnings":[]
}
```

### 错误响应

```json
{"error":{"code":"invalid_json","message":"请求体必须是有效 JSON"}}
```

- `400`：`invalid_json`、`invalid_payload`
- `404`：`not_found`
- `422`：`unsupported_kind`、`empty_content`、`invalid_url`、`empty_images`、`too_many_images`、`invalid_image`、`unsupported_image_type`
