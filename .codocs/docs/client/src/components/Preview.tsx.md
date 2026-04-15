---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/components/Preview.tsx
  source_hash: sha256:abdf582fcc4445d53c1bb1601935e7653e3156d143778c32d9dfc031232a0e85
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T15:28:12.715224+08:00'
---
# Preview.tsx

根据文件类型渲染文件内容，分六路：image / markdown / code / text / binary / unknown。

**Props**：`selectedFile`（null 时显示占位）+ `onScrollDown`（向下滚动超 10px 时回调）+ `onScrollUpAtTop`（已在顶部继续上滚时回调，供 App 展开文件列表）。

**渲染分支**：image 直接 `<img src="/api/read?...">` 不发 fetch（但图片超 10MB 时客户端拦截，显示 banner）；markdown 走 `react-markdown + remark-gfm + remark-frontmatter`；code/unknown 走 `highlight.js` + 行号注入；text 用 `<pre>` 纯文本；binary 显示占位；unknown 加载中时显示"加载中..."占位。

**强制加载（force load）**：
- `forceLoadPath: string | null` state 记录当前已强制加载的文件路径；切换文件时自动失效（useEffect 中 `setForceLoadPath(prev => prev === path ? prev : null)`）。
- 触发条件：① 文本/代码/markdown 底部 truncationBanner 中"强制加载完整文件"按钮；② 图片超 10MB 时的"强制加载完整图片"按钮。
- 强制加载时 fetch 附加 `?force=1`，服务端绕过截断/大小限制。
- 图片强制加载：`isForced && isOversize` 时 `<img src>` 使用 `?force=1` URL。

**truncationBanner**：`truncated=true` 时在内容底部（markdown/code/text 三路）渲染警告条 + 按钮，code 路包在 `padding 0 16px 16px` 的 wrapper div 里（避免 `padding:0` container 漏白边）。

**fetch 取消**：`useEffect` 依赖 `[selectedFile?.path, forceLoadPath]`，用 `cancelled` flag 防止路径切换后异步回调污染 state。

**`container()` 辅助**：统一封装容器 div（`flex:1 / overflowY:auto`），所有返回分支复用，确保 `onScroll` 统一挂载。
