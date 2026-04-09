# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (server + client concurrently)
npm run dev

# Build for production (tsc server + vite client)
npm run build

# Start production server
npm start

# Server only (dev mode with hot reload)
npm run dev:server

# Client only (Vite dev server, proxies /api → localhost:3001)
npm run dev:client
```

## Architecture

Monorepo with Node.js backend (`server/`) and React frontend (`client/`), communicating via REST + SSE.

**Server** (`server/`) — Fastify on port 3001:
- `index.ts` — app setup, CORS (dev only), static serving of `client/dist` (prod only)
- `routes/files.ts` — `GET /api/files?path=` → sorted directory listing
- `routes/read.ts` — `GET /api/read?path=` → file content (text/binary/image stream)
- `routes/watch.ts` — `GET /api/watch?path=` → SSE stream for real-time directory changes
- `utils/fs.ts` — path resolution, security boundary checks, file type detection

**Client** (`client/src/`) — React 18 + Vite:
- `App.tsx` — root layout: header + breadcrumb + file list (top 1/3) + preview (bottom 2/3)
- `components/FileList.tsx` — directory listing, subscribes to SSE via `useFiles` hook
- `components/Preview.tsx` — renders code (highlight.js), markdown (marked + DOMPurify), images, plain text
- `components/Breadcrumb.tsx` — clickable path navigation
- `hooks/useFiles.ts` — fetches file list + maintains SSE connection for auto-refresh
- `utils/fileType.ts` — determines render type (code/markdown/image/text) from extension

**Build outputs:**
- Server: `tsc -p tsconfig.node.json` → `dist/server/`
- Client: `vite build client` → `client/dist/`

## Key Details

- **Security**: Path traversal blocked via `path.resolve()` + prefix check; `.ssh/` returns 403
- **Size limits**: Text files 1 MB (truncates to 1000 lines); images 10 MB
- **SSE debounce**: 300ms delay on `fs.watch` changes before notifying clients
- **Port**: `PORT` env var (default 3001); **Home dir**: `HOME` env var (default Termux path)
- **highlight.js chunk** is ~912 KB — large but intentional, split into separate lazy chunk
- No test framework or linter is configured yet
