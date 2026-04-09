# useFiles.ts

目录数据获取 Hook，初次加载 + SSE 实时监听目录变化，路径切换时自动取消旧请求。

## 签名

```ts
function useFiles(path: string): { data: FileEntry[], loading: boolean, error: string | null }
```

- `path` 变化时重新发起请求并重建 SSE 连接
- 初次加载显示 `loading: true`；SSE 触发的静默刷新不重置 loading

## 并发与取消

- 用 `AbortController` 取消初次 fetch（path 变更时在 cleanup 中 abort）
- `cancelled` flag 防止 unmount 后 setState：`useEffect` cleanup 置 `true`，所有回调检查该 flag
- SSE 错误不处理（浏览器自动重连），cleanup 中 `es.close()` 关闭连接

## SSE 刷新逻辑

监听 `/api/watch?path=...`，收到 `event.data === 'change'` 时静默 re-fetch（不触发 loading）。刷新用新的 `AbortController`，失败静默忽略。

## `fetchFiles` 稳定性

用 `useCallback([], [])` 包裹，避免成为 `useEffect` 依赖项变化来源（实际上它没有捕获任何变量，纯函数形式）。

## 依赖

- `types.ts` → `FileEntry`
- API：`GET /api/files?path=`，`GET /api/watch?path=`（SSE）
