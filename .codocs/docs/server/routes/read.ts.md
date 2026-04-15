---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/read.ts
  source_hash: sha256:623e3484e73d2ac3b69429c906f8e1e212c160d19e2c0ccefc6fbfe52c9f7506
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T15:28:12.571040+08:00'
---
# server/routes/read.ts

`GET /api/read?path=&[force=1]` — 根据文件类型分四路处理：

| 类型 | 响应 |
|------|------|
| 图片（IMAGE_EXTS） | 直接流式返回二进制，超 10MB 返回 413（`force=1` 绕过限制） |
| 文本（TEXT_EXTS / `text/*` MIME / dotfile） | JSON `{ type:'text', content, mimeType, truncated }` |
| 无扩展名非 dotfile | 嗅探前 512 字节：magic bytes → null byte → shebang，文本时返回 `{ type:'text', ..., language?, truncated }` |
| 其他 | JSON `{ type:'binary', content:'', mimeType }` |

**force=1**：`?force=1` 绕过两个限制：文本截断（完整读取）、图片 10MB 上限（允许流式返回大图）。

**dotfile**：ext 为空且文件名以 `.` 开头时一律视为文本，避免被 `mime-types` 错判为 binary。

**sniffFileType(buf)**：对无扩展名非 dotfile 文件嗅探类型：
1. **Magic bytes**：ELF、PNG、JPEG、PDF、ZIP、gzip → binary
2. **Null byte**：含 `\x00` → binary
3. **Shebang**：`#!` 开头 → 识别 bash/python/node/ruby/perl，返回对应 `language`；无识别 shebang → `language: 'plaintext'`
4. 其余 → text with `language: 'plaintext'`

**文本截断**：超 1MB 时读前 1MB → 切行 → 取前 1000 行，`truncated: true`（不再嵌入提示字符串，由客户端决定如何展示）。

**安全**：`isSshPath` 在 `resolveSafePath` 之前检查，确保 `.ssh/` 下不存在的文件也返回 403 而非 404。

