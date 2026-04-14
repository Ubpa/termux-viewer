---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/components/Preview.tsx
  source_hash: sha256:4d2d5dfc7e2b695a531fd10ae5d755ac2384020a3f814ef8ab24bfd43147988a
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-15T02:52:12.690461+08:00'
---
# Preview.tsx

根据文件类型渲染文件内容，分六路：image / markdown / code / text / binary / unknown。

**Props**：`selectedFile`（null 时显示占位）+ `onScrollDown`（向下滚动超 10px 时回调）+ `onScrollUpAtTop`（已在顶部继续上滚时回调，供 App 展开文件列表）。

**渲染分支**：image 直接 `<img src="/api/read?...">` 不发 fetch；markdown 走 `react-markdown + remark-gfm + remark-frontmatter`（GFM + YAML front matter 支持，class `markdown-body`）；code/unknown 走 `highlight.js` + 行号注入（字符串拼接 `<span class="line-num">`），lang 优先取 `nameLang`（按文件名硬编码，如 `CMakeLists.txt` → `cmake`），其次 `detectedLang`（服务端嗅探无后缀文件），再 fallback 到扩展名；text 用 `<pre>` 纯文本；binary 显示占位；unknown 加载中时显示"加载中..."占位。

**fetch 取消**：`useEffect` 依赖 `selectedFile`，用 `cancelled` flag 防止路径切换后异步回调污染 state。

**`container()` 辅助**：统一封装容器 div（`flex:1 / overflowY:auto`），所有返回分支复用，确保 `onScroll` 统一挂载。
