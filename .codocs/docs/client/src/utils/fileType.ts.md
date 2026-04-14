---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/utils/fileType.ts
  source_hash: sha256:14d1f2c4b5769fb5caf69410fed401d9b130e0aa7c5c7d308783031a2a8d1093
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T23:22:37.080910+08:00'
---
# fileType.ts

根据扩展名/文件名判断渲染类型、格式化大小、返回 emoji 图标。

**`getRenderType`**：优先级 markdown > image > code > dotfile-code > unknown > text > binary；dotfile（无次级扩展名）归为 code；无后缀的非隐藏文件返回 `'unknown'` 委托服务端嗅探（如 `pre-commit`、`Makefile`、`configure`）。`CODE_EXTS` 含 ts/js/py/sh/json/yaml/c/cpp/h/hpp/hxx/inl/go/rs/ps1/psm1/psd1 等。

**`formatSize`**：格式化字节数为可读单位（B/KB/MB）。

**`fileIcon`**：为文件/目录返回对应 emoji；无后缀的非隐藏文件与 dotfile 同样返回 `📄`（表示文本/代码类型）。
