---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/test/setup.ts
  source_hash: sha256:6fb9151cbcd19bcf625d2d23d85fad9d1c5aa9b8ab32c2aa31c49105bf900e6e
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# setup.ts

测试环境初始化。注册 `@testing-library/jest-dom` 的自定义 matchers（`toBeInTheDocument` 等），并在每个测试后自动 `cleanup()` 清理 DOM。

必须从 `client/` 目录运行 vitest 才能加载此文件（由 `vite.config.ts` 的 `test.setupFiles` 指定）。
