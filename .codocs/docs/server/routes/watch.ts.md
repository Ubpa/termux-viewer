---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/watch.ts
  source_hash: sha256:14399a00afa7b2382a794921a1bf12b2cac26685e64dbf8ad7703def316697f1
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/routes/watch.ts

`GET /api/watch?path=` — SSE 目录变更推送。连接后立即发 `connected`，目录变化时发 `change`（防抖 300ms）。通过 `reply.hijack()` 阻止 Fastify 自动结束响应；`X-Accel-Buffering: no` 防 nginx 缓冲。客户端断开时清除定时器并 `FSWatcher.close()`；`{ persistent: false }` 不阻止 Node 退出。
