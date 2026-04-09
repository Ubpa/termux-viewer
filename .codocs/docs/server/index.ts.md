# server/index.ts

Fastify 应用入口。根据 `NODE_ENV` 区分开发/生产模式，注册三条 API 路由，生产环境兼作静态文件服务器。

## 启动行为

| 条件 | 行为 |
|------|------|
| `NODE_ENV !== 'development'` | `isProd=true`，不注册 CORS，注册静态插件服务 `client/dist/` |
| `NODE_ENV === 'development'` | 注册 `@fastify/cors`（`origin: true`），不服务静态文件 |

## 关键配置

- 端口：`PORT` 环境变量，默认 `3001`，监听 `0.0.0.0`（供 Android 局域网访问）
- 静态文件根路径：`__dirname/../../client/dist`（相对编译后 `dist/server/index.js` 的两级上溯）
- SPA fallback：未匹配路由返回 `index.html`（支持前端路由）
- logger 开启（Fastify 内置 pino）

## 路由注册顺序

`filesRoute` → `readRoute` → `watchRoute`（顺序不影响功能，均无前缀冲突）

