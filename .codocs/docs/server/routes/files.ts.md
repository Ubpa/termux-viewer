---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/files.ts
  source_hash: sha256:d12fcd4e7fdae2279eb1581749b69dec9be967ba48df0ad2712b35d05e01bd4e
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/routes/files.ts

`GET /api/files?path=` — 返回 `FileEntry[]`，目录优先，同类 `localeCompare` 字母序。路径经 `resolveSafePath` 安全解析；stat 失败时 size=0、mtime 为当前时间，不中断整体列举。
