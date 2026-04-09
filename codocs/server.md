# server

Node.js + Fastify 后端。提供文件系统 REST API 和 SSE 实时推送，生产模式兼作 React 静态文件服务器。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| index.ts | 文件 | Fastify 应用入口，路由注册，dev/prod 模式切换 |
| routes/ | 目录 | 三条 API 路由插件（files、read、watch） |
| utils/ | 目录 | 文件系统工具函数（路径安全、类型判断） |
