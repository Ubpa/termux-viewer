# server/index.ts

Fastify 入口。`isProd = NODE_ENV !== 'development'`（需显式设 dev 环境变量）。开发注册 CORS；生产服务 `client/dist/` + SPA fallback（`reply.sendFile` 需 `@ts-ignore`）。端口 `PORT` 默认 `3001`，监听 `0.0.0.0`。
