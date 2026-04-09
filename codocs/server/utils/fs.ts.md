# server/utils/fs.ts

## 职责

服务端文件系统工具层：路径安全验证、SSH 目录检测、扩展名处理、文件类型判断，以及大小常量定义。

## 导出一览

| 导出 | 类型 | 说明 |
|------|------|------|
| `HOME` | `string` | 取自 `process.env.HOME`，fallback 为 Termux 默认路径 |
| `IMAGE_EXTS` | `Set<string>` | 支持的图片扩展名集合 |
| `MAX_TEXT_BYTES` | `number` | 文本文件读取上限：1 MB |
| `MAX_IMAGE_BYTES` | `number` | 图片文件传输上限：10 MB |
| `resolveSafePath` | `async fn` | 将相对路径解析为安全的绝对路径 |
| `isSshPath` | `fn` | 检测路径是否在 `~/.ssh` 目录内 |
| `getExt` | `fn` | 取小写扩展名（含点） |
| `isImage` | `fn` | 判断是否为图片扩展名 |

## `resolveSafePath` 详解

**输入**：相对于 HOME 的路径字符串（来自客户端 query）  
**输出**：经过符号链接解析后的真实绝对路径  
**抛出**：带 `statusCode` 属性的 Error（403 / 404）

**两阶段校验**：

1. **快速字符串检查**（不访问磁盘）：`path.join(HOME, relPath)` → `path.resolve()` 后检查是否以 `HOME + sep` 开头，拦截 `../` 等路径穿越尝试。
2. **符号链接解析**：调用 `fs.realpath()` 获取真实路径，再次检查是否仍在 HOME 内。符号链接指向 HOME 外的文件会在此阶段被拦截（403）；文件不存在返回 404。

**设计意图**：两次校验确保既能防御字符串层面的 traversal，也能防御符号链接逃逸（symlink escape）。

## `isSshPath`

检测 `~/.ssh` 路径。`SSH_DIR` 在模块加载时以 `HOME` 为基础计算，是 module-level 常量。判断条件：路径等于 `SSH_DIR` 本身，或以 `SSH_DIR + sep` 开头（含子文件/目录）。

`read.ts` 在调用 `resolveSafePath` 之前就进行此检测，目的是确保即使文件不存在也能返回 403 而非 404（避免泄露 `.ssh/` 内文件是否存在）。

## `getExt`

`path.extname(name).toLowerCase()`。对无扩展名文件返回 `''`，dotfile（`.bashrc`）也返回 `''`（`path.extname('.bashrc')` 返回空串）。

## 常量

```ts
MAX_TEXT_BYTES  = 1 MB   // 超出时截断读取
MAX_IMAGE_BYTES = 10 MB  // 超出时拒绝传输
IMAGE_EXTS = { .jpg, .jpeg, .png, .gif, .webp, .svg }
```
