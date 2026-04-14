---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/utils/fileType.ts
  source_hash: sha256:5e2d8f1cb1eaa5c0178e6e8e0cd6c45ec456a4b2dd6dacafd66460c2daf73f86
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T02:56:04.786263+08:00'
---
# fileType.ts

根据扩展名/文件名判断渲染类型、格式化大小、返回 emoji 图标。

**`getRenderType`**：优先级 markdown > image > code > named-code > dotfile-code > unknown > text > binary；`CMakeLists.txt` 按文件名识别为 code；dotfile（无次级扩展名）归为 code；无后缀的非隐藏文件返回 `'unknown'` 委托服务端嗅探（如 `pre-commit`、`Makefile`、`configure`）。`CODE_EXTS` 含 ts/js/py/sh/json/yaml/c/cpp/h/hpp/hxx/inl/go/rs/ps1/psm1/psd1/.cmake 等。

**`formatSize`**：格式化字节数为可读单位（B/KB/MB）。

**`fileIcon`**：为文件/目录返回对应 emoji；无后缀的非隐藏文件与 dotfile 同样返回 `📄`（表示文本/代码类型）。
