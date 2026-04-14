# 无后缀文件类型检测 Design

## 背景

当前无后缀文件（如 `pre-commit`、`Makefile`、`configure`）在服务端走 mime-types 查询，
返回 `application/octet-stream`，直接标记为 binary，前端什么都不显示。
有后缀的 dotfile（`.gitignore`）有特判，但无后缀普通文件没有。

## 目标

- 无后缀文件如果是文本，就正常展示（尽量带代码高亮）
- 真正的二进制文件（ELF、图片等）仍显示"不支持预览"
- 能识别 shebang，用对应语言高亮

## 方案：服务端嗅探

在 `server/routes/read.ts` 里，对无后缀文件读前 512 字节做三步检测：

### 步骤 1：Magic bytes

| 字节 | 类型 | 处理 |
|------|------|------|
| `\x7fELF` | ELF binary | → binary |
| `\x89PNG` | PNG | → binary（已有 IMAGE_EXTS，但无后缀时也能拦截） |
| `\xff\xd8\xff` | JPEG | → binary |
| `%PDF` | PDF | → binary |
| `PK\x03\x04` | ZIP/APK/JAR | → binary |
| `\x1f\x8b` | gzip | → binary |

### 步骤 2：Null byte 嗅探

前 512 字节中含 `\x00` → binary。  
这是 git、file 命令的通用判定：文本文件不含 null byte。

### 步骤 3：Shebang 识别

通过前两步后认定为文本，再检测第一行是否是 shebang：

| Shebang | language |
|---------|----------|
| `#!/bin/bash`、`#!/usr/bin/env bash` | `bash` |
| `#!/usr/bin/env python`、`#!/usr/bin/python` | `python` |
| `#!/usr/bin/env node`、`#!/usr/bin/node` | `javascript` |
| `#!/usr/bin/env ruby` | `ruby` |
| `#!/usr/bin/perl` | `perl` |
| 其他 / 无 shebang | `plaintext`（不做高亮） |

## 接口变更

### `ReadResponse`（`types.ts`）

新增可选字段 `language`，服务端检测到 shebang 时携带：

```ts
interface ReadResponse {
  type: 'text' | 'binary'
  content: string
  mimeType: string
  language?: string   // 新增，如 'bash' / 'python'，无则省略
}
```

### 服务端逻辑（`read.ts`）

新增工具函数 `sniffFileType(buf: Buffer, filename: string)`，
返回 `{ isBinary: boolean; language?: string }`。

调用时机：`ext === ''` 且非 dotfile 时触发（dotfile 已有特判走文本）。

### 客户端逻辑

`Preview.tsx`：收到 `data.language` 时用它指定 hljs 语言，而不是靠 `ext` 猜。  
`fileType.ts`：`getRenderType` 中无后缀非 dotfile 原本返回 `binary`，
改为返回 `'unknown'`，由服务端响应最终决定渲染类型。

实际上客户端改动很小：`Preview.tsx` 里在 `renderType === 'binary'` 之前，
改成先发请求，再根据 `data.type` 决定要不要渲染，`language` 用于高亮。

## 文件改动范围

| 文件 | 改动 |
|------|------|
| `server/routes/read.ts` | 新增 `sniffFileType`，无后缀文件触发嗅探，响应带 `language` |
| `client/src/types.ts` | `ReadResponse` 加 `language?: string` |
| `client/src/utils/fileType.ts` | 无后缀非 dotfile 改返回 `'unknown'`（新增类型） |
| `client/src/components/Preview.tsx` | `unknown` 类型走请求，用 `language` 高亮 |

## 不改动的部分

- 有后缀文件的判断逻辑不变
- dotfile 特判不变
- 图片走 IMAGE_EXTS 的逻辑不变
- 安全边界（HOME 限制、.ssh 拦截）不变
