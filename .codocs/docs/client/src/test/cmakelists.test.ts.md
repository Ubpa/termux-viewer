---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/test/cmakelists.test.ts
  source_hash: sha256:ac59484223c95f165a78263e327d6c413861b118206a8835c53ed21914176808
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T02:56:48.591194+08:00'
---
# cmakelists.test.ts

`getRenderType` 针对 `CMakeLists.txt` 的回归测试。

验证 `getRenderType('.txt', 'CMakeLists.txt')` 返回 `'code'`（大小写不敏感），防止 named-file 特判被 TEXT_EXTS 提前截断的 bug 复现。
