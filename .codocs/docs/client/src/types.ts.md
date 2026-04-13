# types.ts

前后端共用类型定义，客户端使用，服务端 `routes/files.ts` 有本地副本 `FileEntry`。

**`FileEntry`**：目录项，`path` 为相对 HOME 的绝对路径（如 `/projects/foo/bar.ts`），`ext` 含点（`.ts`）。  
**`ReadResponse`**：读文件响应，`type` 为 `'text'|'binary'`，binary 时 `content` 为空字符串。  
**`ErrorResponse`**：错误响应体，`code` 为 HTTP 状态码。  
**`RenderType`**：渲染类型枚举，由 `utils/fileType.ts` 的 `getRenderType()` 返回。
