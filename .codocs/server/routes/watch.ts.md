# server/routes/watch.ts

`GET /api/watch?path=` — SSE 目录变更推送。连接后立即发 `connected`，目录变化时发 `change`（防抖 300ms）。通过 `reply.hijack()` 阻止 Fastify 自动结束响应；`X-Accel-Buffering: no` 防 nginx 缓冲。客户端断开时清除定时器并 `FSWatcher.close()`；`{ persistent: false }` 不阻止 Node 退出。
