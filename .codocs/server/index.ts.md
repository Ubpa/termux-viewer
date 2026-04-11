# server/index.ts

Fastify 应用入口。开发模式注册 CORS，生产模式注册静态文件插件服务 `client/dist/`（SPA fallback 返回 `index.html`）。端口：`PORT` 环境变量，默认 `3001`，监听 `0.0.0.0`。
