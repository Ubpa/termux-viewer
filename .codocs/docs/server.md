---
codocs:
  schema: 1
  source_type: dir
  source_path: server
  entries_hash: sha256:f5722062c121427fb73e8363973fa4aa2d3fcf8fe6def1c3be7697713a859ee1
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T23:06:37.819685+08:00'
  source_hash: null
---
# server

Node.js + Fastify 后端。提供文件系统 REST API 和 SSE 实时推送，生产模式兼作 React 静态文件服务器。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| index.ts | 文件 | Fastify 应用入口，路由注册，dev/prod 模式切换 |
| routes/ | 目录 | 五条 API 路由插件（files、read、watch、gitRemote、delete） |
| utils/ | 目录 | 文件系统工具函数（路径安全、类型判断） |
