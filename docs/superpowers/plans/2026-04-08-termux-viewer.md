# termux-viewer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web file browser for Termux Home directory with code/image/Markdown preview, accessible from a phone browser.

**Architecture:** Fastify backend serves file listing and content APIs with path-jail security; Vite + React frontend renders a mobile-first vertical layout (file list top, preview bottom); in production Fastify also serves the Vite build as static files from a single port.

**Tech Stack:** Node.js 25, Fastify, @fastify/static, @fastify/cors, Vite, React 18, TypeScript, highlight.js, marked, DOMPurify, tsx, concurrently

---

## File Map

### New files to create

```
termux-viewer/
├── package.json                        # root scripts + all deps
├── tsconfig.json                       # base TS config (shared)
├── tsconfig.node.json                  # server TS config (outDir: dist/server)
├── server/
│   ├── index.ts                        # Fastify init, plugin registration, listen
│   ├── routes/
│   │   ├── files.ts                    # GET /api/files?path= → FileEntry[]
│   │   └── read.ts                     # GET /api/read?path= → JSON or binary stream
│   └── utils/
│       └── fs.ts                       # resolveSafePath(), getFileType(), SIZE_LIMITS
├── client/
│   ├── index.html                      # Vite entry HTML
│   ├── vite.config.ts                  # Vite config with /api proxy
│   └── src/
│       ├── main.tsx                    # React root mount
│       ├── App.tsx                     # state: currentPath, selectedFile
│       ├── types.ts                    # FileEntry, ReadResponse, RenderType
│       ├── utils/
│       │   └── fileType.ts             # getRenderType(ext) → RenderType
│       ├── hooks/
│       │   └── useFiles.ts             # useFiles(path) → {data, loading, error}
│       └── components/
│           ├── Breadcrumb.tsx          # clickable path segments, horizontal scroll
│           ├── FileList.tsx            # sorted file list with icons + sizes
│           └── Preview.tsx            # renders markdown/code/image/text/binary
```

---

## Chunk 1: Project Scaffold & Config

### Task 1: Initialize package.json and install dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create .gitignore**

```bash
cd ~/projects/termux-viewer
```

Write `.gitignore`:

```
node_modules/
dist/
```

- [ ] **Step 2: Create package.json**

Write `package.json`:

```json
{
  "name": "termux-viewer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite client",
    "build": "tsc -p tsconfig.node.json && vite build client",
    "start": "node dist/server/index.js"
  }
}
```

Note: `vite build client` with root=`client/` outputs to `client/dist/` by default. The server in production mode will serve from `client/dist/`.

- [ ] **Step 3: Install all dependencies**

```bash
cd ~/projects/termux-viewer
npm install fastify @fastify/static @fastify/cors
npm install react react-dom marked dompurify highlight.js
npm install -D vite @vitejs/plugin-react typescript tsx concurrently @types/node @types/react @types/react-dom @types/dompurify
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
cd ~/projects/termux-viewer
git add .gitignore package.json package-lock.json
git commit -m "chore: initialize project and install dependencies"
```

---

### Task 2: TypeScript config files

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

- [ ] **Step 1: Write tsconfig.json** (base, shared by both)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 2: Write tsconfig.node.json** (server-only, extends base)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "node16",
    "module": "node16",
    "outDir": "dist/server",
    "rootDir": "server"
  },
  "include": ["server/**/*.ts"]
}
```

- [ ] **Step 3: Write client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 4: Write client/index.html**

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>termux-viewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Commit**

```bash
cd ~/projects/termux-viewer
git add tsconfig.json tsconfig.node.json client/
git commit -m "chore: add TypeScript and Vite config"
```

---

## Chunk 2: Backend — Path Security & File Utilities

### Task 3: server/utils/fs.ts — safe path resolution

**Files:**
- Create: `server/utils/fs.ts`

- [ ] **Step 1: Write server/utils/fs.ts**

```typescript
import path from 'path'
import fs from 'fs/promises'

export const HOME = process.env.HOME ?? '/data/data/com.termux/files/home'

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])

const SSH_DIR = path.join(HOME, '.ssh')

const MAX_TEXT_BYTES = 1024 * 1024       // 1 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Resolve a client-supplied relative path to an absolute path,
 * checking it stays within HOME and isn't a symlink escape.
 * Throws with statusCode 403 if the path is unsafe.
 */
export async function resolveSafePath(relPath: string): Promise<string> {
  // Treat relPath as relative to HOME
  const joined = path.join(HOME, relPath)
  const resolved = path.resolve(joined)

  // First prefix check (fast, before hitting disk)
  if (!resolved.startsWith(HOME + path.sep) && resolved !== HOME) {
    const err = new Error('Forbidden') as NodeJS.ErrnoException
    ;(err as any).statusCode = 403
    throw err
  }

  // Resolve symlinks to real path
  let real: string
  try {
    real = await fs.realpath(resolved)
  } catch (e: any) {
    const isNotFound = e.code === 'ENOENT'
    const err = new Error(isNotFound ? 'Not found' : 'Forbidden') as any
    err.statusCode = isNotFound ? 404 : 403
    throw err
  }

  if (!real.startsWith(HOME + path.sep) && real !== HOME) {
    const err = new Error('Forbidden') as any
    err.statusCode = 403
    throw err
  }

  return real
}

/**
 * Returns true if the path is inside ~/.ssh (content reading blocked).
 */
export function isSshPath(absolutePath: string): boolean {
  return absolutePath.startsWith(SSH_DIR + path.sep) || absolutePath === SSH_DIR
}

/**
 * Returns the lowercase extension including the dot, e.g. ".ts".
 * Returns "" for no extension or directories.
 */
export function getExt(name: string): string {
  return path.extname(name).toLowerCase()
}

export function isImage(ext: string): boolean {
  return IMAGE_EXTS.has(ext)
}

export { MAX_TEXT_BYTES, MAX_IMAGE_BYTES }
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd ~/projects/termux-viewer
npx tsc -p tsconfig.node.json --noEmit
```

Expected: no output (clean compile).

- [ ] **Step 3: Commit**

```bash
git add server/
git commit -m "feat: add safe path resolver and fs utilities"
```

---

## Chunk 3: Backend — API Routes

### Task 4: server/routes/files.ts — directory listing

**Files:**
- Create: `server/routes/files.ts`

- [ ] **Step 1: Write server/routes/files.ts**

```typescript
import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { resolveSafePath, getExt, HOME } from '../utils/fs.js'

interface FileEntry {
  name: string
  path: string   // relative to HOME
  isDir: boolean
  size: number
  mtime: string
  ext: string
}

export async function filesRoute(app: FastifyInstance) {
  app.get('/api/files', async (request, reply) => {
    const { path: relPath = '/' } = request.query as { path?: string }

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(absolutePath, { withFileTypes: true })
    } catch {
      return reply.code(404).send({ error: 'Directory not found', code: 404 })
    }

    const result: FileEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const entryAbs = `${absolutePath}/${entry.name}`
        const relEntryPath = entryAbs.replace(HOME, '')
        let size = 0
        let mtime = new Date().toISOString()
        try {
          const stat = await fs.stat(entryAbs)
          size = entry.isDirectory() ? 0 : stat.size
          mtime = stat.mtime.toISOString()
        } catch {
          // ignore stat errors for inaccessible entries
        }
        return {
          name: entry.name,
          path: relEntryPath,
          isDir: entry.isDirectory(),
          size,
          mtime,
          ext: entry.isDirectory() ? '' : getExt(entry.name),
        }
      })
    )

    // Dirs first, then files; each group sorted alphabetically
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return reply.send(result)
  })
}
```

- [ ] **Step 2: Write server/routes/read.ts — file content**

```typescript
import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import mime from 'mime-types'
import { resolveSafePath, isSshPath, isImage, getExt, MAX_TEXT_BYTES, MAX_IMAGE_BYTES } from '../utils/fs.js'

export async function readRoute(app: FastifyInstance) {
  app.get('/api/read', async (request, reply) => {
    const { path: relPath } = request.query as { path?: string }

    if (!relPath) {
      return reply.code(400).send({ error: 'path parameter required', code: 400 })
    }

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    if (isSshPath(absolutePath)) {
      return reply.code(403).send({ error: 'Access to .ssh directory is forbidden', code: 403 })
    }

    let stat: import('fs').Stats
    try {
      stat = await fs.stat(absolutePath)
    } catch {
      return reply.code(404).send({ error: 'File not found', code: 404 })
    }

    if (stat.isDirectory()) {
      return reply.code(400).send({ error: 'Path is a directory', code: 400 })
    }

    const ext = getExt(absolutePath)
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream'

    // Images: stream binary directly
    if (isImage(ext)) {
      if (stat.size > MAX_IMAGE_BYTES) {
        return reply.code(413).send({ error: 'Image too large (max 10MB)', code: 413 })
      }
      reply.header('Content-Type', mimeType)
      reply.header('Content-Length', stat.size)
      return reply.send(createReadStream(absolutePath))
    }

    // Text files
    // Note: dotfiles like .gitignore have path.extname() === '' so they won't
    // match any ext in TEXT_EXTS. They are caught by mimeType.startsWith('text/')
    // below — mime-types detects them as text/plain — so no special casing needed here.
    const TEXT_EXTS = new Set([
      '.md', '.markdown', '.txt', '.log', '.env',
      '.ts', '.tsx', '.js', '.jsx', '.py', '.sh', '.json',
      '.yaml', '.yml', '.toml', '.css', '.html', '.xml',
      '.c', '.cpp', '.go', '.rs', '.java', '.rb', '.php',
      '.ini', '.conf', '.sql', '.dockerfile', '.makefile',
    ])

    if (TEXT_EXTS.has(ext) || mimeType.startsWith('text/')) {
      let content: string
      if (stat.size > MAX_TEXT_BYTES) {
        const buf = Buffer.alloc(MAX_TEXT_BYTES)
        const fh = await fs.open(absolutePath, 'r')
        await fh.read(buf, 0, MAX_TEXT_BYTES, 0)
        await fh.close()
        const lines = buf.toString('utf-8').split('\n').slice(0, 1000)
        content = lines.join('\n') + '\n\n[--- 文件过大，仅显示前 1000 行 ---]'
      } else {
        content = await fs.readFile(absolutePath, 'utf-8')
      }
      return reply.send({ type: 'text', content, mimeType })
    }

    // Binary / unknown
    return reply.send({ type: 'binary', content: '', mimeType })
  })
}
```

- [ ] **Step 3: Install mime-types**

```bash
cd ~/projects/termux-viewer
npm install mime-types
npm install -D @types/mime-types
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/ package.json package-lock.json
git commit -m "feat: add /api/files and /api/read routes"
```

---

### Task 5: server/index.ts — Fastify entry point

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Write server/index.ts**

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { filesRoute } from './routes/files.js'
import { readRoute } from './routes/read.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT ?? 3001)

const app = Fastify({ logger: true })

// CORS for dev (Vite dev server on different port)
if (!isProd) {
  await app.register(cors, { origin: true })
}

// API routes
await app.register(filesRoute)
await app.register(readRoute)

// Production: serve Vite build (output is client/dist/ since vite root=client/)
if (isProd) {
  const distPath = path.join(__dirname, '../../client/dist')
  await app.register(staticPlugin, {
    root: distPath,
    prefix: '/',
  })
  // SPA fallback
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })
}

await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`termux-viewer running on http://0.0.0.0:${PORT}`)
```

- [ ] **Step 2: Test server starts**

```bash
cd ~/projects/termux-viewer
npm run dev:server
```

Expected: logs `termux-viewer running on http://0.0.0.0:3001`  
Press Ctrl+C to stop.

- [ ] **Step 3: Test API manually**

```bash
curl "http://localhost:3001/api/files?path=/" | head -c 200
```

Expected: JSON array of FileEntry objects.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "feat: add Fastify server entry point"
```

---

## Chunk 4: Frontend — Types, Utilities, Hook

### Task 6: client/src/types.ts — shared type definitions

**Files:**
- Create: `client/src/types.ts`

- [ ] **Step 1: Write client/src/types.ts**

```typescript
export interface FileEntry {
  name: string
  path: string   // relative to HOME, e.g. "/projects/foo/bar.ts"
  isDir: boolean
  size: number
  mtime: string
  ext: string
}

export interface ReadResponse {
  type: 'text' | 'binary'
  content: string
  mimeType: string
}

export interface ErrorResponse {
  error: string
  code: number
}

export type RenderType = 'markdown' | 'code' | 'image' | 'text' | 'binary'
```

---

### Task 7: client/src/utils/fileType.ts — render type resolver

**Files:**
- Create: `client/src/utils/fileType.ts`

- [ ] **Step 1: Write client/src/utils/fileType.ts**

```typescript
import type { RenderType } from '../types'

const MARKDOWN_EXTS = new Set(['.md', '.markdown'])
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])
const CODE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.sh', '.json',
  '.yaml', '.yml', '.toml', '.css', '.html', '.xml',
  '.c', '.cpp', '.go', '.rs', '.java', '.rb', '.php',
  '.ini', '.conf', '.sql', '.dockerfile', '.makefile',
])
const TEXT_EXTS = new Set(['.txt', '.log', '.env', '.csv'])

/**
 * Determine how a file should be rendered in the preview.
 * Pass `name` (the bare filename, e.g. ".gitignore") in addition to `ext`
 * so that dotfiles whose path.extname() returns "" can still be rendered
 * as code rather than binary.
 */
export function getRenderType(ext: string, name?: string): RenderType {
  const e = ext.toLowerCase()
  if (MARKDOWN_EXTS.has(e)) return 'markdown'
  if (IMAGE_EXTS.has(e)) return 'image'
  if (CODE_EXTS.has(e)) return 'code'
  if (TEXT_EXTS.has(e)) return 'text'
  // Dotfiles with no extension: e.g. .gitignore, .bashrc, .zshrc, .bash, .zsh
  // path.extname('.gitignore') === '' so ext-based lookup always misses them.
  if (name && name.startsWith('.') && !name.slice(1).includes('.')) return 'code'
  return 'binary'
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function fileIcon(entry: { isDir: boolean; ext: string; name: string }): string {
  if (entry.isDir) return '📁'
  const e = entry.ext.toLowerCase()
  if (IMAGE_EXTS.has(e)) return '🖼️'
  if (MARKDOWN_EXTS.has(e)) return '📝'
  if (CODE_EXTS.has(e)) return '📄'
  // Dotfile with no extension
  if (entry.name.startsWith('.') && !entry.name.slice(1).includes('.')) return '📄'
  return '📃'
}
```

---

### Task 8: client/src/hooks/useFiles.ts — data fetching hook

**Files:**
- Create: `client/src/hooks/useFiles.ts`

- [ ] **Step 1: Write client/src/hooks/useFiles.ts**

```typescript
import { useState, useEffect } from 'react'
import type { FileEntry } from '../types'

interface UseFilesResult {
  data: FileEntry[]
  loading: boolean
  error: string | null
}

export function useFiles(path: string): UseFilesResult {
  const [data, setData] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData([])

    fetch(`/api/files?path=${encodeURIComponent(path)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.error ?? `HTTP ${res.status}`) })
        return res.json()
      })
      .then((json: FileEntry[]) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [path])

  return { data, loading, error }
}
```

- [ ] **Step 2: Commit types + utilities + hook**

```bash
cd ~/projects/termux-viewer
git add client/src/
git commit -m "feat: add shared types, fileType utils, and useFiles hook"
```

---

## Chunk 5: Frontend — Components

### Task 9: client/src/components/Breadcrumb.tsx

**Files:**
- Create: `client/src/components/Breadcrumb.tsx`

- [ ] **Step 1: Write Breadcrumb.tsx**

```tsx
interface BreadcrumbProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
  // Split path into segments: "/" → ["~"], "/projects/foo" → ["~", "projects", "foo"]
  const parts = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean)

  const segments = [
    { label: '~', path: '/' },
    ...parts.map((part, i) => ({
      label: part,
      path: '/' + parts.slice(0, i + 1).join('/'),
    })),
  ]

  return (
    <nav
      style={{
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        padding: '6px 12px',
        fontSize: '13px',
        background: '#1e1e2e',
        color: '#cdd6f4',
        borderBottom: '1px solid #313244',
      }}
    >
      {segments.map((seg, i) => (
        <span key={seg.path}>
          {i > 0 && <span style={{ color: '#6c7086', margin: '0 4px' }}>/</span>}
          {i < segments.length - 1 ? (
            <button
              onClick={() => onNavigate(seg.path)}
              style={{
                background: 'none',
                border: 'none',
                color: '#89b4fa',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {seg.label}
            </button>
          ) : (
            <span style={{ color: '#cdd6f4', fontWeight: 600 }}>{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
```

---

### Task 10: client/src/components/FileList.tsx

**Files:**
- Create: `client/src/components/FileList.tsx`

- [ ] **Step 1: Write FileList.tsx**

```tsx
import type { FileEntry } from '../types'
import { useFiles } from '../hooks/useFiles'
import { formatSize, fileIcon } from '../utils/fileType'

interface FileListProps {
  path: string
  onNavigate: (path: string) => void
  onSelectFile: (file: FileEntry) => void
  selectedPath: string | null
}

export function FileList({ path, onNavigate, onSelectFile, selectedPath }: FileListProps) {
  const { data, loading, error } = useFiles(path)

  return (
    <div
      style={{
        height: '50%',
        overflowY: 'auto',
        background: '#181825',
        borderBottom: '1px solid #313244',
      }}
    >
      {loading && (
        <div style={{ padding: '20px', color: '#6c7086', textAlign: 'center' }}>
          加载中...
        </div>
      )}
      {error && (
        <div style={{ padding: '16px', color: '#f38ba8' }}>
          ⚠️ {error}
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <div style={{ padding: '20px', color: '#6c7086', textAlign: 'center' }}>
          （空目录）
        </div>
      )}
      {!loading && !error && data.map((entry) => (
        <div
          key={entry.path}
          onClick={() => entry.isDir ? onNavigate(entry.path) : onSelectFile(entry)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            cursor: 'pointer',
            borderBottom: '1px solid #1e1e2e',
            background: selectedPath === entry.path ? '#313244' : 'transparent',
            userSelect: 'none',
          }}
        >
          <span style={{ marginRight: '10px', fontSize: '16px' }}>{fileIcon(entry)}</span>
          <span
            style={{
              flex: 1,
              color: entry.isDir ? '#89b4fa' : '#cdd6f4',
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.name}
          </span>
          {!entry.isDir && (
            <span style={{ color: '#6c7086', fontSize: '12px', marginLeft: '8px', flexShrink: 0 }}>
              {formatSize(entry.size)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

### Task 11: client/src/components/Preview.tsx

**Files:**
- Create: `client/src/components/Preview.tsx`

- [ ] **Step 1: Write Preview.tsx**

```tsx
import { useEffect, useState, type CSSProperties } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { FileEntry, ReadResponse } from '../types'
import { getRenderType } from '../utils/fileType'

interface PreviewProps {
  selectedFile: FileEntry | null
}

export function Preview({ selectedFile }: PreviewProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)

  useEffect(() => {
    setImgError(null)   // always clear image-specific error on file change

    if (!selectedFile) {
      setContent('')
      setError(null)
      return
    }

    const renderType = getRenderType(selectedFile.ext, selectedFile.name)
    if (renderType === 'image' || renderType === 'binary') {
      setContent('')
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setContent('')

    fetch(`/api/read?path=${encodeURIComponent(selectedFile.path)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e: any) => { throw new Error(e.error ?? `HTTP ${res.status}`) })
        return res.json()
      })
      .then((data: ReadResponse) => {
        if (!cancelled) {
          if (data.type === 'binary') {
            setError('不支持预览此文件类型')
          } else {
            setContent(data.content)
          }
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [selectedFile])

  const containerStyle: CSSProperties = {
    height: '50%',
    overflowY: 'auto',
    background: '#11111b',
    padding: '16px',
    color: '#cdd6f4',
    fontSize: '14px',
    lineHeight: '1.6',
  }

  if (!selectedFile) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        点击上方文件预览内容
      </div>
    )
  }

  const renderType = getRenderType(selectedFile.ext, selectedFile.name)

  if (renderType === 'image') {
    return (
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        <img
          src={`/api/read?path=${encodeURIComponent(selectedFile.path)}`}
          alt={selectedFile.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => setImgError('图片加载失败（可能无权限访问）')}
        />
        {imgError && <div style={{ color: '#f38ba8', marginTop: '8px' }}>⚠️ {imgError}</div>}
      </div>
    )
  }

  if (renderType === 'binary') {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        🚫 不支持预览此文件类型
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, color: '#f38ba8' }}>
        ⚠️ {error}
      </div>
    )
  }

  if (renderType === 'markdown') {
    const html = DOMPurify.sanitize(marked.parse(content, { async: false }) as string)
    return (
      <div
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: html }}
        className="markdown-body"
      />
    )
  }

  if (renderType === 'code') {
    const lang = selectedFile.ext.replace('.', '')
    const highlighted = hljs.getLanguage(lang)
      ? hljs.highlight(content, { language: lang }).value
      : hljs.highlightAuto(content).value

    const lines = highlighted.split('\n')
    // Remove trailing empty line caused by final newline
    if (lines[lines.length - 1] === '') lines.pop()
    const lineNumbersHtml = lines
      .map((line, i) => `<span class="line-num">${i + 1}</span>${line}`)
      .join('\n')

    return (
      <div style={{ ...containerStyle, padding: 0 }}>
        <pre style={{ margin: 0, padding: '16px', overflowX: 'auto' }}>
          <code
            style={{ fontSize: '13px', fontFamily: 'monospace' }}
            dangerouslySetInnerHTML={{ __html: lineNumbersHtml }}
          />
        </pre>
      </div>
    )
  }

  // text
  return (
    <div style={containerStyle}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '13px' }}>
        {content}
      </pre>
    </div>
  )
}
```

- [ ] **Step 2: Commit all components**

```bash
cd ~/projects/termux-viewer
git add client/src/components/
git commit -m "feat: add Breadcrumb, FileList, and Preview components"
```

---

## Chunk 6: Frontend — App Entry & Styles

### Task 12: App.tsx, main.tsx, and global styles

**Files:**
- Create: `client/src/App.tsx`
- Create: `client/src/main.tsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Write client/src/index.css**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
  width: 100%;
  background: #11111b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-text-size-adjust: 100%;
}

/* Markdown styles */
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: #cba6f7;
  margin: 12px 0 6px;
}
.markdown-body p { margin-bottom: 8px; }
.markdown-body code {
  background: #313244;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}
.markdown-body pre {
  background: #1e1e2e;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 10px;
}
.markdown-body pre code { background: none; padding: 0; }
.markdown-body a { color: #89b4fa; }
.markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 8px; }
.markdown-body blockquote {
  border-left: 3px solid #6c7086;
  padding-left: 10px;
  color: #a6adc8;
}
.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
.markdown-body th, .markdown-body td {
  border: 1px solid #313244;
  padding: 6px 10px;
  text-align: left;
}
.markdown-body th { background: #1e1e2e; }

/* Code line numbers */
.line-num {
  display: inline-block;
  width: 2.5em;
  color: #6c7086;
  text-align: right;
  margin-right: 16px;
  user-select: none;
  border-right: 1px solid #313244;
  padding-right: 8px;
}
```

- [ ] **Step 2: Write client/src/App.tsx**

```tsx
import { useState } from 'react'
import { Breadcrumb } from './components/Breadcrumb'
import { FileList } from './components/FileList'
import { Preview } from './components/Preview'
import type { FileEntry } from './types'

export function App() {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: '#1e1e2e',
        borderBottom: '1px solid #313244',
        color: '#cba6f7',
        fontWeight: 700,
        fontSize: '15px',
        flexShrink: 0,
      }}>
        🗂 termux-viewer
      </div>

      {/* Breadcrumb */}
      <div style={{ flexShrink: 0 }}>
        <Breadcrumb currentPath={currentPath} onNavigate={handleNavigate} />
      </div>

      {/* File list + Preview share remaining height equally */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FileList
          path={currentPath}
          onNavigate={handleNavigate}
          onSelectFile={setSelectedFile}
          selectedPath={selectedFile?.path ?? null}
        />
        <Preview selectedFile={selectedFile} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write client/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Commit**

```bash
cd ~/projects/termux-viewer
git add client/src/App.tsx client/src/main.tsx client/src/index.css
git commit -m "feat: add App entry point and global styles"
```

---

## Chunk 7: Integration & Smoke Test

### Task 13: Run full dev mode and verify

- [ ] **Step 1: Start the server in one terminal**

```bash
cd ~/projects/termux-viewer
npm run dev:server
```

Expected: `termux-viewer running on http://0.0.0.0:3001`

- [ ] **Step 2: Start the client in another terminal**

```bash
cd ~/projects/termux-viewer
npm run dev:client
```

Expected: Vite outputs `Local: http://localhost:5173/`

- [ ] **Step 3: Test file listing API**

```bash
curl "http://localhost:3001/api/files?path=/" | python3 -m json.tool | head -30
```

Expected: JSON array with `name`, `path`, `isDir`, `size`, `mtime`, `ext` fields.

- [ ] **Step 4: Test read API**

```bash
# Read a text file
curl "http://localhost:3001/api/read?path=/.bashrc" | python3 -m json.tool | head -10
```

Expected: `{ "type": "text", "content": "...", "mimeType": "..." }`

- [ ] **Step 5: Test path security**

```bash
# Should return 403
curl -v "http://localhost:3001/api/files?path=/../../../etc"
# Should return 403
curl -v "http://localhost:3001/api/read?path=/.ssh/id_rsa"
```

Expected: HTTP 403 with `{ "error": "Forbidden", "code": 403 }`

- [ ] **Step 6: Open browser and verify UI**

Open `http://localhost:5173` on phone or browser.

Verify:
- [ ] File list appears showing `~` contents
- [ ] Directories show 📁, files show appropriate icons
- [ ] Clicking a directory navigates into it, breadcrumb updates
- [ ] Clicking a `.md` file shows rendered Markdown in lower half
- [ ] Clicking a `.ts` or `.py` file shows syntax-highlighted code
- [ ] Clicking an image file shows the image
- [ ] Breadcrumb segments are clickable and navigate correctly
- [ ] Layout fills the screen, no horizontal overflow on phone

- [ ] **Step 7: Final commit**

```bash
cd ~/projects/termux-viewer
git add -A
git commit -m "feat: complete termux-viewer implementation"
```

---

### Task 14: Production build verification

- [ ] **Step 1: Build**

```bash
cd ~/projects/termux-viewer
npm run build
```

Expected: `client/dist/` created with `index.html`, JS/CSS bundles. No TypeScript errors.

- [ ] **Step 2: Start production server**

```bash
NODE_ENV=production node dist/server/index.js
```

Expected: server starts on port 3001.

- [ ] **Step 3: Verify production mode**

```bash
curl http://localhost:3001/
```

Expected: returns HTML (the Vite `index.html`).

```bash
curl "http://localhost:3001/api/files?path=/"
```

Expected: returns JSON file listing.

- [ ] **Step 4: Final production commit**

```bash
git add -A
git commit -m "chore: verify production build works"
```
