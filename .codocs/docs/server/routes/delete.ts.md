---
codocs:
  schema: 1
  source_type: file
  source_path: server/routes/delete.ts
  source_hash: sha256:9ccef1c7cff11feb8c14d3385ec59bdaa12acd67c03e584f7755e84f9655bd51
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# delete.ts

`DELETE /api/delete?path=` — 删除文件或目录。安全校验复用 `resolveSafePath()` + `isSshPath()`，禁止删除 HOME 根。
