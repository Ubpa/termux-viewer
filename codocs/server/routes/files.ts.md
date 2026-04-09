# server/routes/files.ts

## 职责

提供目录列举 API（`GET /api/files`），返回指定目录下的文件和子目录列表。

## 接口

### `GET /api/files`

**Query 参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `path` | string | `'/'` | 相对于 HOME 的路径 |

**成功响应**：`FileEntry[]`（JSON 数组）

**错误响应**

| 状态码 | 原因 |
|--------|------|
| 400/403 | `resolveSafePath` 拒绝（路径越界） |
| 404 | 目录不存在或无权读取 |
| 500 | 其他内部错误 |

## FileEntry 结构

```ts
interface FileEntry {
  name: string    // 条目名（不含路径）
  path: string    // 相对于 HOME 的完整路径
  isDir: boolean
  size: number    // 目录固定为 0，文件为字节数
  mtime: string   // ISO 8601
  ext: string     // 目录为空串；文件取扩展名（由 getExt 处理）
}
```

## 关键行为

- **安全边界**：路径解析强制经过 `resolveSafePath`，防止 path traversal 越出 HOME。
- **stat 容错**：对每个条目调用 `fs.stat`，若失败（无权限、符号链接悬空等）则 size=0、mtime 为当前时间，不中断整体列举。
- **排序规则**：目录优先，同类按名称 `localeCompare` 字母序。目录的 size 统一为 0，不做递归统计。
- **ext 字段**：仅文件计算，目录返回空串，由 `getExt` 实现具体逻辑（见 utils/fs.ts）。

## 依赖

- `../utils/fs.js`：`resolveSafePath`、`getExt`、`HOME`
