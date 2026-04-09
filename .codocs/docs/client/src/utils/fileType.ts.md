# fileType.ts

## 职责
根据文件扩展名和文件名判断渲染类型、格式化文件大小、返回显示图标。

## 导出函数

### `getRenderType(ext, name?) → RenderType`
决定文件在 Preview 中如何渲染。

优先级：markdown > image > code > text > dotfile-code > binary

**dotfile 特殊处理**：`path.extname('.gitignore')` 返回 `""`，ext 查表必定 miss。通过 `name.startsWith('.') && !name.slice(1).includes('.')` 识别纯点文件（`.gitignore`、`.bashrc` 等），归类为 `code`。带次级扩展名的如 `.eslintrc.js` 不在此分支，由 `.js` 正常命中 CODE_EXTS。

### `formatSize(bytes) → string`
- `0` → `""` （目录项不显示大小）
- `< 1024` → `"nB"`
- `< 1MB` → `"n.nKB"`
- `≥ 1MB` → `"n.nMB"`

### `fileIcon(entry) → string`
按 isDir > image > markdown > code > dotfile > 其他 顺序返回 emoji（📁/🖼️/📝/📄/📃）。

## 扩展集合

| 集合 | 包含 |
|------|------|
| `MARKDOWN_EXTS` | `.md` `.markdown` |
| `IMAGE_EXTS` | `.jpg` `.jpeg` `.png` `.gif` `.webp` `.svg` |
| `CODE_EXTS` | ts/tsx/js/jsx/py/sh/json/yaml/yml/toml/css/html/xml/c/cpp/go/rs/java/rb/php/ini/conf/sql/dockerfile/makefile |
| `TEXT_EXTS` | `.txt` `.log` `.env` `.csv` |

## 注意
- `ext` 参数应为 `path.extname()` 的结果（含前导点，如 `".ts"`），函数内部 `toLowerCase()` 处理大小写
- `name` 参数可选，不传时 dotfile 回退为 `binary`
