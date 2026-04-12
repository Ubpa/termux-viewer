# server/routes

四条 API 路由，每条对应一个独立 Fastify 插件（`FastifyPluginAsync`），注册于 `index.ts`。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| files.ts | 文件 | `GET /api/files` — 目录列表，排序：目录优先，同类字母序 |
| read.ts | 文件 | `GET /api/read` — 文件读取，分图片流/文本/binary 三路 |
| watch.ts | 文件 | `GET /api/watch` — SSE 目录变更推送，debounce 300ms |
| gitRemote.ts | 文件 | `GET /api/git-remote` — 返回当前目录所属 git 仓库的 origin remote URL |
