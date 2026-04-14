---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/read.ts
  source_hash: sha256:72fe3527fdc0581c8f371250a781cf6d2749e7eec135b341fe3891d2836ceaac
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/routes/read.ts

`GET /api/read?path=` — 根据文件类型分三路处理：

| 类型 | 响应 |
|------|------|
| 图片（IMAGE_EXTS） | 直接流式返回二进制，超 10MB 返回 413 |
| 文本（TEXT_EXTS / `text/*` MIME / dotfile） | JSON `{ type:'text', content, mimeType }` |
| 其他 | JSON `{ type:'binary', content:'', mimeType }` |

**dotfile**：ext 为空且文件名以 `.` 开头时一律视为文本，避免被 `mime-types` 错判为 binary。

**文本截断**：超 1MB 时读前 1MB → 切行 → 取前 1000 行，末尾加中文提示。

**安全**：`isSshPath` 在 `resolveSafePath` 之前检查，确保 `.ssh/` 下不存在的文件也返回 403 而非 404。
