---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/utils/fileType.ts
  source_hash: sha256:9521ee489c8cbcbe9de7bf3e234cf613def56bf321283d9920e31f48a8cd83f1
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# fileType.ts

根据扩展名/文件名判断渲染类型、格式化大小、返回 emoji 图标。

**`getRenderType`**：优先级 markdown > image > code > dotfile-code > text > binary；dotfile（无次级扩展名）归为 code。`CODE_EXTS` 含 ts/js/py/sh/json/yaml/c/cpp/h/hpp/hxx/inl/go/rs/ps1/psm1/psd1 等。
