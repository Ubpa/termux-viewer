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

- **Dev URLs**: client dev server at `:5173` (proxies `/api` to `:3001`); production at `:3001` only
- No test framework or linter is configured yet

## Architecture

Monorepo with Node.js backend (`server/`) and React frontend (`client/`), communicating via REST + SSE.

**Server** (`server/`) — Fastify on port 3001:
- `index.ts` — app setup, CORS (dev only), static serving of `client/dist` (prod only)
- `routes/files.ts` — `GET /api/files?path=` → sorted directory listing (dirs first, then alpha)
- `routes/read.ts` — `GET /api/read?path=` → file content (text/binary/image stream)
- `routes/watch.ts` — `GET /api/watch?path=` → SSE stream for real-time directory changes
- `utils/fs.ts` — path resolution, security boundary checks, file type detection

**Client** (`client/src/`) — React 18 + Vite:
- `App.tsx` — root layout: header + breadcrumb + file list (top 1/3) + preview (bottom 2/3)
- `components/FileList.tsx` — directory listing, subscribes to SSE via `useFiles` hook
- `components/Preview.tsx` — renders code (highlight.js), markdown (marked + DOMPurify), images, plain text
- `components/Breadcrumb.tsx` — clickable path navigation
- `hooks/useFiles.ts` — fetches file list + maintains SSE connection for auto-refresh
- `utils/fileType.ts` — determines render type (code/markdown/image/text) from extension; also exports `formatSize` and `fileIcon`

**Shared types** (`client/src/types.ts`): `FileEntry`, `ReadResponse`, `ErrorResponse`, `RenderType` — used client-side; server's `routes/files.ts` has a local duplicate of `FileEntry`.

**Build outputs:**
- Server: `tsc -p tsconfig.node.json` (module: node16) → `dist/server/`
- Client: `vite build client` → `client/dist/`

## Key Details

- **Security**: All paths resolved relative to `HOME`; symlinks resolved via `fs.realpath`; `.ssh/` blocked at route entry before symlink resolution; path traversal rejected with 403
- **Size limits**: Text files 1 MB (truncates to 1000 lines with Chinese notice); images 10 MB
- **Dotfile handling**: `path.extname('.gitignore') === ''`, so dotfiles (name starts with `.`, no second dot) are treated as code in both `utils/fileType.ts` (client) and `routes/read.ts` (server)
- **SSE debounce**: 300ms delay on `fs.watch` changes before notifying clients
- **Port**: `PORT` env var (default 3001); **Home dir**: `HOME` env var (default Termux path)
- **highlight.js chunk** is ~912 KB — large but intentional, split into separate lazy chunk via `vite.config.ts` `manualChunks`
- **Semantic docs**: `.codocs/docs/` contains auto-generated semantic documentation for each source file — useful for quick codebase orientation
