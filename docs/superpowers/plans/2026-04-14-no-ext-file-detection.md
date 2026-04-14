# No-Extension File Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 无后缀文件（`pre-commit`、`Makefile` 等）通过服务端嗅探判断是否为文本，文本文件正常展示并尝试代码高亮，真正的二进制仍显示"不支持预览"。

**Architecture:** 服务端 `read.ts` 新增 `sniffFileType(buf, filename)` 工具函数，对无后缀非 dotfile 读前 512 字节，依次做 magic bytes → null byte → shebang 三步检测，结果通过 `ReadResponse.language` 字段传回客户端。客户端 `fileType.ts` 新增 `'unknown'` RenderType，`Preview.tsx` 对 unknown 类型先发请求再按响应渲染。

**Tech Stack:** Node.js/TypeScript (Fastify), React 18, highlight.js

---

### Task 1: 服务端 `sniffFileType` 工具函数

**Files:**
- Modify: `server/routes/read.ts`

- [ ] **Step 1: 在 `read.ts` 顶部（import 之后）添加 `sniffFileType` 函数**

在 `export async function readRoute` 之前插入：

```typescript
/**
 * Sniff the type of a no-extension, non-dotfile by examining its first 512 bytes.
 * Returns { isBinary: true } for binary files, or { isBinary: false, language? } for text.
 */
function sniffFileType(buf: Buffer): { isBinary: boolean; language?: string } {
  // Step 1: Magic bytes
  if (buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
    return { isBinary: true } // ELF
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { isBinary: true } // PNG
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { isBinary: true } // JPEG
  }
  if (buf.length >= 4 && buf.slice(0, 4).toString('ascii') === '%PDF') {
    return { isBinary: true } // PDF
  }
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return { isBinary: true } // ZIP/APK/JAR
  }
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return { isBinary: true } // gzip
  }

  // Step 2: Null byte sniffer — text files never contain \x00
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x00) return { isBinary: true }
  }

  // Step 3: Shebang detection
  const head = buf.toString('utf-8', 0, Math.min(buf.length, 200))
  if (head.startsWith('#!')) {
    const firstLine = head.split('\n')[0]
    if (/bash/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/zsh/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/sh/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/python/.test(firstLine)) return { isBinary: false, language: 'python' }
    if (/node/.test(firstLine)) return { isBinary: false, language: 'javascript' }
    if (/ruby/.test(firstLine)) return { isBinary: false, language: 'ruby' }
    if (/perl/.test(firstLine)) return { isBinary: false, language: 'perl' }
    return { isBinary: false, language: 'plaintext' }
  }

  return { isBinary: false }
}
```

- [ ] **Step 2: 在 `readRoute` 内部，找到 "Binary / unknown" 返回前加入嗅探逻辑**

在 `read.ts` 里，当前 "Binary / unknown" 的判断是：

```typescript
    // Binary / unknown
    return reply.send({ type: 'binary', content: '', mimeType })
```

在这行**之前**插入（紧接在 `if (TEXT_EXTS.has(ext) || ...)` 块的 `}` 后）：

```typescript
    // No-extension, non-dotfile: sniff first 512 bytes
    if (ext === '' && !path.basename(absolutePath).startsWith('.')) {
      const sniffSize = Math.min(stat.size, 512)
      const sniffBuf = Buffer.alloc(sniffSize)
      const fh = await fs.open(absolutePath, 'r')
      await fh.read(sniffBuf, 0, sniffSize, 0)
      await fh.close()

      const sniff = sniffFileType(sniffBuf)
      if (!sniff.isBinary) {
        let content: string
        if (stat.size > MAX_TEXT_BYTES) {
          const buf = Buffer.alloc(MAX_TEXT_BYTES)
          const fh2 = await fs.open(absolutePath, 'r')
          await fh2.read(buf, 0, MAX_TEXT_BYTES, 0)
          await fh2.close()
          const lines = buf.toString('utf-8').split('\n').slice(0, 1000)
          content = lines.join('\n') + '\n\n[--- 文件过大，仅显示前 1000 行 ---]'
        } else {
          content = await fs.readFile(absolutePath, 'utf-8')
        }
        const response: { type: string; content: string; mimeType: string; language?: string } = {
          type: 'text', content, mimeType,
        }
        if (sniff.language) response.language = sniff.language
        return reply.send(response)
      }
    }
```

- [ ] **Step 3: 构建验证**

```bash
npm run build 2>&1 | tail -20
```

Expected: 无 TypeScript 错误，build 成功。

- [ ] **Step 4: 手动验证**

```bash
npm start &
sleep 1
# 测试 pre-commit（bash shebang）
curl -s "http://localhost:3001/api/read?path=.git/hooks/pre-commit" | python3 -m json.tool | head -10
# 预期: type=text, language=bash
```

Expected 输出含：`"type": "text"` 和 `"language": "bash"`

```bash
# 测试 ELF binary（如果有的话）
curl -s "http://localhost:3001/api/read?path=.git/objects/pack/..." | python3 -m json.tool | head -5
# 预期: type=binary
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/read.ts
git commit -m "feat(server): sniff no-extension files — magic bytes + null byte + shebang"
```

---

### Task 2: `ReadResponse` 加 `language` 字段

**Files:**
- Modify: `client/src/types.ts`

- [ ] **Step 1: 更新 `ReadResponse` 接口**

将 `types.ts` 中：

```typescript
export interface ReadResponse {
  type: 'text' | 'binary'
  content: string
  mimeType: string
}
```

改为：

```typescript
export interface ReadResponse {
  type: 'text' | 'binary'
  content: string
  mimeType: string
  language?: string  // set by server for no-extension files with shebang
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types.ts
git commit -m "feat(types): add optional language field to ReadResponse"
```

---

### Task 3: `fileType.ts` 新增 `'unknown'` RenderType

**Files:**
- Modify: `client/src/utils/fileType.ts`
- Modify: `client/src/types.ts`

- [ ] **Step 1: 在 `types.ts` 的 `RenderType` 中加入 `'unknown'`**

将：

```typescript
export type RenderType = 'markdown' | 'code' | 'image' | 'text' | 'binary'
```

改为：

```typescript
export type RenderType = 'markdown' | 'code' | 'image' | 'text' | 'binary' | 'unknown'
```

- [ ] **Step 2: `fileType.ts` 中无后缀非 dotfile 改返回 `'unknown'`**

将 `getRenderType` 里：

```typescript
  // Dotfiles with no extension: e.g. .gitignore, .bashrc, .zshrc, .bash, .zsh
  // path.extname('.gitignore') === '' so ext-based lookup always misses them.
  if (name && name.startsWith('.') && !name.slice(1).includes('.')) return 'code'
  return 'binary'
```

改为：

```typescript
  // Dotfiles with no extension: e.g. .gitignore, .bashrc, .zshrc, .bash, .zsh
  // path.extname('.gitignore') === '' so ext-based lookup always misses them.
  if (name && name.startsWith('.') && !name.slice(1).includes('.')) return 'code'
  // No extension, non-dotfile (e.g. pre-commit, Makefile, configure):
  // let the server sniff and decide — return 'unknown' so Preview always fetches
  if (ext === '' && name && !name.startsWith('.')) return 'unknown'
  return 'binary'
```

- [ ] **Step 3: `fileIcon` 中为 `unknown` 用中性图标**

将 `fileType.ts` 的 `fileIcon` 函数末尾：

```typescript
  // Dotfile with no extension
  if (entry.name.startsWith('.') && !entry.name.slice(1).includes('.')) return '📄'
  return '📃'
```

改为：

```typescript
  // Dotfile with no extension
  if (entry.name.startsWith('.') && !entry.name.slice(1).includes('.')) return '📄'
  // No-extension non-dotfile (unknown until server sniffs)
  if (entry.ext === '' && !entry.name.startsWith('.')) return '📄'
  return '📃'
```

- [ ] **Step 4: Build 验证**

```bash
npm run build 2>&1 | tail -20
```

Expected: 无 TypeScript 错误。

- [ ] **Step 5: Commit**

```bash
git add client/src/types.ts client/src/utils/fileType.ts
git commit -m "feat(client): add 'unknown' RenderType for no-extension non-dotfiles"
```

---

### Task 4: `Preview.tsx` 处理 `'unknown'` 类型

**Files:**
- Modify: `client/src/components/Preview.tsx`

- [ ] **Step 1: `useEffect` 中去掉对 `unknown` 的跳过**

当前 `useEffect` 开头有：

```typescript
    const renderType = getRenderType(selectedFile.ext, selectedFile.name)
    if (renderType === 'image' || renderType === 'binary') {
      setContent('')
      setError(null)
      setLoading(false)
      return
    }
```

改为（加 state 存 language）：

```typescript
    const renderType = getRenderType(selectedFile.ext, selectedFile.name)
    if (renderType === 'image' || renderType === 'binary') {
      setContent('')
      setError(null)
      setLoading(false)
      return
    }
    // 'unknown' falls through to fetch — server will sniff and decide
```

- [ ] **Step 2: 在组件顶部加 `language` state**

在 `const [imgError, setImgError] = useState<string | null>(null)` 后加：

```typescript
  const [detectedLang, setDetectedLang] = useState<string | undefined>(undefined)
```

在 `useEffect` 开头 `setImgError(null)` 后加：

```typescript
    setDetectedLang(undefined)
```

- [ ] **Step 3: fetch 结果处理时存 language**

找到：

```typescript
        if (data.type === 'binary') {
            setError('不支持预览此文件类型')
          } else {
            setContent(data.content)
          }
```

改为：

```typescript
        if (data.type === 'binary') {
            setError('不支持预览此文件类型')
          } else {
            setContent(data.content)
            if (data.language) setDetectedLang(data.language)
          }
```

- [ ] **Step 4: 渲染阶段处理 `unknown`**

在 `const renderType = getRenderType(...)` 这一行（渲染阶段，在 `useEffect` 外）后，找到 `if (renderType === 'binary')` 块：

```typescript
  if (renderType === 'binary') {
    return container(
      <span>🚫 不支持预览此文件类型</span>,
      { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }
    )
  }
```

在它**之前**插入 `unknown` 的 loading 占位（fetch 尚未完成时）：

```typescript
  if (renderType === 'unknown' && loading) {
    return container(
      <span>加载中...</span>,
      { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }
    )
  }
```

- [ ] **Step 5: 渲染 `code` 时优先用 `detectedLang`**

找到：

```typescript
  if (renderType === 'code') {
    const lang = selectedFile.ext.replace('.', '')
    const highlighted = hljs.getLanguage(lang)
      ? hljs.highlight(content, { language: lang }).value
      : hljs.highlightAuto(content).value
```

改为：

```typescript
  if (renderType === 'code' || (renderType === 'unknown' && content)) {
    const lang = detectedLang ?? selectedFile.ext.replace('.', '')
    const highlighted = (lang && lang !== 'plaintext' && hljs.getLanguage(lang))
      ? hljs.highlight(content, { language: lang }).value
      : hljs.highlightAuto(content).value
```

- [ ] **Step 6: Build 验证**

```bash
npm run build 2>&1 | tail -20
```

Expected: 无 TypeScript 错误，build 成功。

- [ ] **Step 7: 端到端手动验证**

```bash
npm start &
sleep 1
```

在浏览器打开 `http://localhost:3001`，导航到 `.git/hooks/`，点击 `pre-commit`：
- 应显示 bash 代码高亮（而不是"🚫 不支持预览"）

点击 `.git/hooks/pre-commit.sample`（有后缀）：
- 应正常显示（原有逻辑不受影响）

```bash
kill %1
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/Preview.tsx
git commit -m "feat(preview): render unknown-type files using server-sniffed language"
```

---

### Task 5: 推送 & codocs 文档更新

**Files:**
- Modify: `.codocs/docs/server/routes/read.ts.md`
- Modify: `.codocs/docs/client/src/utils/fileType.ts.md`
- Modify: `.codocs/docs/client/src/types.ts.md`
- Modify: `.codocs/docs/client/src/components/Preview.tsx.md`

- [ ] **Step 1: 更新 `read.ts.md`**

读取 `.codocs/docs/server/routes/read.ts.md`，在文档里补充：

- `sniffFileType(buf)` 函数：magic bytes → null byte → shebang 三步，返回 `{ isBinary, language? }`
- 触发条件：`ext === ''` 且非 dotfile
- 响应新增 `language` 字段

- [ ] **Step 2: 更新其他三个 MD**

- `fileType.ts.md`：补充 `'unknown'` RenderType，无后缀非 dotfile 返回 `unknown`
- `types.ts.md`：补充 `ReadResponse.language?: string`
- `Preview.tsx.md`：补充 `unknown` 类型走 fetch，用 `detectedLang` 高亮

- [ ] **Step 3: 刷新哈希**

```bash
python .codocs/scripts/codocs.py . refresh-hash .codocs/docs/server/routes/read.ts.md
python .codocs/scripts/codocs.py . refresh-hash .codocs/docs/client/src/utils/fileType.ts.md
python .codocs/scripts/codocs.py . refresh-hash .codocs/docs/client/src/types.ts.md
python .codocs/scripts/codocs.py . refresh-hash .codocs/docs/client/src/components/Preview.tsx.md
```

- [ ] **Step 4: Lint 验证**

```bash
python .codocs/scripts/codocs.py . --lint
```

Expected: `OK no issues found`

- [ ] **Step 5: 最终提交并推送**

```bash
git add .codocs/
git commit -m "docs(codocs): update MDs for no-extension file sniffing feature"
git push
```
