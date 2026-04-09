# server/routes/read.ts

## 职责

提供文件读取 API（`GET /api/read`），根据文件类型分三路处理：图片流式返回二进制、文本返回内容字符串、其他返回 binary 标记。

## 接口

### `GET /api/read`

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 相对于 HOME 的路径 |

**成功响应**（三种形态）

| type | 说明 | 附加字段 |
|------|------|---------|
| `'text'` | 文本文件 | `content: string`, `mimeType: string` |
| `'binary'` | 不可读文件 | `content: ''`, `mimeType: string` |
| 直接流 | 图片 | HTTP body 为原始字节，`Content-Type` + `Content-Length` header |

**错误响应**

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 path / path 是目录 |
| 403 | SSH 路径（`.ssh/` 目录下任意文件） |
| 404 | 文件不存在 |
| 413 | 图片超过 10MB（`MAX_IMAGE_BYTES`） |
| 500 | 内部错误 |

## 文件类型判断逻辑

```
1. isImage(ext)  →  直接流式返回，超 MAX_IMAGE_BYTES 则 413
2. TEXT_EXTS.has(ext) || mimeType.startsWith('text/') || isDotfile  →  text
3. 其他  →  binary
```

**dotfile 特殊处理**：扩展名为空且文件名以 `.` 开头（如 `.bashrc`、`.gitignore`）一律视为文本，因为 `mime-types` 对这类文件返回 `false`，会错误降为 binary。

## 大文件截断策略（文本）

超过 `MAX_TEXT_BYTES` 时：
1. 用 `fs.open` + `fh.read` 只读取前 `MAX_TEXT_BYTES` 字节
2. 按换行切分，取前 1000 行
3. 末尾追加 `[--- 文件过大，仅显示前 1000 行 ---]` 提示

目的是避免一次性加载超大日志/源文件导致内存占用过高。

## 安全边界

- **SSH 路径预检**：在 `resolveSafePath` 之前先对原始路径做 `isSshPath` 检查。这样即使 `.ssh/` 下的文件不存在（symlink 悬空等），也会在解析之前 403 拒绝，避免路径解析副作用。
- **HOME 边界**：`resolveSafePath` 确保路径不越出 HOME。

## 依赖

- `../utils/fs.js`：`resolveSafePath`、`isSshPath`、`isImage`、`getExt`、`MAX_TEXT_BYTES`、`MAX_IMAGE_BYTES`、`HOME`
- `mime-types`：MIME 类型推断
