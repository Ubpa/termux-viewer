---
codocs:
  schema: 1
  source_type: file
  source_path: server/utils/fs.ts
  source_hash: sha256:5f548b9a0d9d60632b629d84e9e4fb8487db7b9b172ac9d3a460a933ffd1edf1
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# server/utils/fs.ts

文件系统工具层：路径安全、SSH 检测、扩展名处理，及大小常量。

**`resolveSafePath`**：两阶段防御——字符串层拦截 `../` 穿越，`fs.realpath()` 防符号链接逃逸（越界 403，不存在 404）。

**`isSshPath`**：`read.ts` 在 `resolveSafePath` 前调用，确保 `.ssh/` 路径即使不存在也返回 403。

常量：`MAX_TEXT_BYTES=1MB`，`MAX_IMAGE_BYTES=10MB`。
