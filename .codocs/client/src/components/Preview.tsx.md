# Preview.tsx

根据文件类型渲染文件内容，分五路：image / markdown / code / text / binary。

**Props**：`selectedFile`（null 时显示占位）+ `onScrollDown`（向下滚动超 10px 时回调）+ `onScrollUpAtTop`（已在顶部继续上滚时回调，供 App 展开文件列表）。

**渲染分支**：image 直接 `<img src="/api/read?...">` 不发 fetch；markdown 走 `react-markdown + remark-gfm`（GFM 支持，class `markdown-body`）；code 走 `highlight.js` + 行号注入（字符串拼接 `<span class="line-num">`）；text 用 `<pre>` 纯文本；binary 显示占位。

**fetch 取消**：`useEffect` 依赖 `selectedFile`，用 `cancelled` flag 防止路径切换后异步回调污染 state。

**`container()` 辅助**：统一封装容器 div（`flex:1 / overflowY:auto`），所有返回分支复用，确保 `onScroll` 统一挂载。
