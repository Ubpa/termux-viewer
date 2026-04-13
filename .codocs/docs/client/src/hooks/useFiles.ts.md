# useFiles.ts

目录数据获取 Hook，返回 `{ data: FileEntry[], loading, error }`。

初次 fetch 用 `AbortController` 取消（path 变化时 cleanup abort）；SSE（`/api/watch`）触发的静默刷新不重置 loading；`cancelled` flag 防 unmount 后 setState。SSE 错误静默忽略（浏览器自动重连），cleanup 时 `es.close()`。
