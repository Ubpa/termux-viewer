---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/types.ts
  source_hash: sha256:6fdd36e161d715b47a63580bbf6e9e6de9ab563c4e13987ae8c8a4897ccb50be
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# types.ts

前后端共用类型定义，客户端使用，服务端 `routes/files.ts` 有本地副本 `FileEntry`。

**`FileEntry`**：目录项，`path` 为相对 HOME 的绝对路径（如 `/projects/foo/bar.ts`），`ext` 含点（`.ts`）。  
**`ReadResponse`**：读文件响应，`type` 为 `'text'|'binary'`，binary 时 `content` 为空字符串。  
**`ErrorResponse`**：错误响应体，`code` 为 HTTP 状态码。  
**`RenderType`**：渲染类型枚举，由 `utils/fileType.ts` 的 `getRenderType()` 返回。
