---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/utils/fileType.ts
  source_hash: sha256:c0c19e49157081009544c1e669822eb2fe5135f498e2f66bbc7ec97d13885164
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T02:52:12.612308+08:00'
---
# fileType.ts

根据扩展名/文件名判断渲染类型、格式化大小、返回 emoji 图标。

**`getRenderType`**：优先级 markdown > image > code > named-code > dotfile-code > unknown > text > binary；`CMakeLists.txt` 按文件名识别为 code；dotfile（无次级扩展名）归为 code；无后缀的非隐藏文件返回 `'unknown'` 委托服务端嗅探（如 `pre-commit`、`Makefile`、`configure`）。`CODE_EXTS` 含 ts/js/py/sh/json/yaml/c/cpp/h/hpp/hxx/inl/go/rs/ps1/psm1/psd1/.cmake 等。

**`formatSize`**：格式化字节数为可读单位（B/KB/MB）。

**`fileIcon`**：为文件/目录返回对应 emoji；无后缀的非隐藏文件与 dotfile 同样返回 `📄`（表示文本/代码类型）。
