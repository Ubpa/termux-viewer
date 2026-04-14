---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/hooks/useFiles.ts
  source_hash: sha256:b36f8bce47d50488caa970fa8c903205870b9644eacd1190703e50ab917289c9
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# useFiles.ts

目录数据获取 Hook，返回 `{ data: FileEntry[], loading, error }`。

初次 fetch 用 `AbortController` 取消（path 变化时 cleanup abort）；SSE（`/api/watch`）触发的静默刷新不重置 loading；`cancelled` flag 防 unmount 后 setState。SSE 错误静默忽略（浏览器自动重连），cleanup 时 `es.close()`。
