---
codocs:
  schema: 1
  source_type: file
  source_path: server/index.ts
  source_hash: sha256:f33e83fdeec564a95c222364f3552677353f352bb6fe509be3e176e0654eb3ee
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/index.ts

Fastify 入口。`isProd = NODE_ENV !== 'development'`（需显式设 dev 环境变量）。开发注册 CORS；生产服务 `client/dist/` + SPA fallback（`reply.sendFile` 需 `@ts-ignore`）。端口 `PORT` 默认 `3001`，监听 `0.0.0.0`。
