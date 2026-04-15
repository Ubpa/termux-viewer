---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/types.ts
  source_hash: sha256:fc544189471919865905ea4efa6113d2df87e38298f21577c6b79da0c1dfb8eb
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T15:28:12.642422+08:00'
---
# types.ts

前后端共用类型定义，客户端使用，服务端 `routes/files.ts` 有本地副本 `FileEntry`。

**`FileEntry`**：目录项，`path` 为相对 HOME 的绝对路径（如 `/projects/foo/bar.ts`），`ext` 含点（`.ts`）。  
**`ReadResponse`**：读文件响应，`type` 为 `'text'|'binary'`，binary 时 `content` 为空字符串；`language?` 可选字段由服务端为无后缀文件设置（shebang 嗅探结果）；`truncated?: boolean` 为 true 时表示文件超 1MB 被截断至前 1000 行（未带 `force=1` 时出现）。  
**`ErrorResponse`**：错误响应体，`code` 为 HTTP 状态码。  
**`RenderType`**：渲染类型枚举，由 `utils/fileType.ts` 的 `getRenderType()` 返回。包括 `'markdown'|'code'|'image'|'text'|'binary'|'unknown'`，其中 `'unknown'` 表示无后缀的非隐藏文件（等待服务端嗅探）。
