---
codocs:
  schema: 1
  source_type: dir
  source_path: server/routes
  entries_hash: sha256:4cca0b0189b10a09a0f795b1ed057911ff356f122705a724f59137dcde7fa24d
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T15:28:34.973367+08:00'
  source_hash: null
---
# server/routes

五条 API 路由，每条对应一个独立 Fastify 插件（`FastifyPluginAsync`），注册于 `index.ts`。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| files.ts | 文件 | `GET /api/files` — 目录列表，排序：目录优先，同类字母序 |
| read.ts | 文件 | `GET /api/read` — 文件读取，分图片流/文本/sniff/binary 四路 |
| watch.ts | 文件 | `GET /api/watch` — SSE 目录变更推送，debounce 300ms |
| gitRemote.ts | 文件 | `GET /api/git-remote` — 返回当前目录所属 git 仓库的 origin remote URL |
| delete.ts | 文件 | `DELETE /api/delete` — 删除文件或目录，含安全校验（禁 .ssh、禁 HOME 根） |
