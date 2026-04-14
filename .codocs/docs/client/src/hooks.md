---
codocs:
  schema: 1
  source_type: dir
  source_path: client/src/hooks
  entries_hash: sha256:df641f0a92dddc7743efd517e9bdf2bf2a98562d8ceae9eb48094bd0280cd78d
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# hooks

自定义 Hook 目录，当前仅一个 hook。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| useFiles.ts | 文件 | 拉取目录文件列表并通过 SSE 实时监听变更，返回 `{ data, loading, error }` |
