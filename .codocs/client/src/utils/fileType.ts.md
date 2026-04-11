# fileType.ts

根据扩展名/文件名判断渲染类型、格式化大小、返回 emoji 图标。

**`getRenderType`**：优先级 markdown > image > code > dotfile-code > text > binary；dotfile（无次级扩展名）归为 code。`CODE_EXTS` 含 ts/js/py/sh/json/yaml/c/cpp/h/hpp/hxx/inl/go/rs 等。
