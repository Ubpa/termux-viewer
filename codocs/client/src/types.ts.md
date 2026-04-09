# types.ts

全局类型定义，前后端共用契约。

## FileEntry
目录列表项，由 `/api/files` 返回。

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 文件/目录名（不含路径） |
| `path` | `string` | 相对于 HOME 的绝对路径，如 `/projects/foo/bar.ts` |
| `isDir` | `boolean` | 是否为目录 |
| `size` | `number` | 文件字节数（目录为 0） |
| `mtime` | `string` | 最后修改时间（ISO 字符串） |
| `ext` | `string` | 扩展名，含前导点（如 `".ts"`），无扩展名时为 `""` |

## ReadResponse
`/api/read` 的响应体（文本/代码文件）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `'text' \| 'binary'` | 服务端判断结果；`binary` 时 `content` 为空 |
| `content` | `string` | 文件文本内容 |
| `mimeType` | `string` | MIME 类型字符串 |

图片文件不走此接口，直接由 `<img src="/api/read?path=...">` 请求。

## ErrorResponse
HTTP 错误时的统一响应体：`{ error: string; code: number }`。

## RenderType
`'markdown' | 'code' | 'image' | 'text' | 'binary'`

Preview 组件的渲染分支枚举，由 `getRenderType()` 返回。
