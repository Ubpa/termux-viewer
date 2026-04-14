---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/read.ts
  source_hash: sha256:1f664e13542ba031f9ebce74c013665480b3adeadeac6714d53deb1715fc490b
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T02:52:12.762258+08:00'
---
# server/routes/read.ts

`GET /api/read?path=` — 根据文件类型分四路处理：

| 类型 | 响应 |
|------|------|
| 图片（IMAGE_EXTS） | 直接流式返回二进制，超 10MB 返回 413 |
| 文本（TEXT_EXTS / `text/*` MIME / dotfile） | JSON `{ type:'text', content, mimeType }` |
| 无扩展名非 dotfile | 嗅探前 512 字节：magic bytes → null byte → shebang，文本时返回 `{ type:'text', ..., language? }` |
| 其他 | JSON `{ type:'binary', content:'', mimeType }` |

**dotfile**：ext 为空且文件名以 `.` 开头时一律视为文本，避免被 `mime-types` 错判为 binary。

**sniffFileType(buf)**：对无扩展名非 dotfile 文件嗅探类型：
1. **Magic bytes**：ELF、PNG、JPEG、PDF、ZIP、gzip → binary
2. **Null byte**：含 `\x00` → binary
3. **Shebang**：`#!` 开头 → 识别 bash/python/node/ruby/perl，返回对应 `language`；无识别 shebang → `language: 'plaintext'`
4. 其余 → text with `language: 'plaintext'`

**文本截断**：超 1MB 时读前 1MB → 切行 → 取前 1000 行，末尾加中文提示。

**安全**：`isSshPath` 在 `resolveSafePath` 之前检查，确保 `.ssh/` 下不存在的文件也返回 403 而非 404。

