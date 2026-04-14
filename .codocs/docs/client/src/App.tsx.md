---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/App.tsx
  source_hash: sha256:4ce1280a35fd13c638e102242932fe4248cfb82ce0e91f5c2995df86db7f3827
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# App.tsx

根组件，持有 `currentPath / selectedFile / listCollapsed / remoteUrl` 四个状态，组装 Header / Breadcrumb行 / FileList / Preview。

Breadcrumb 所在行 `onClick` 切换 `listCollapsed`；FileList wrapper 用 `minHeight/maxHeight` 过渡实现折叠动画；Preview 的 `onScrollDown` 回调在向下滚动时自动折叠，`onScrollUpAtTop` 在顶部继续上滚时自动展开。

`handleLoad`：FileList 加载完成时回调，检测是否有 README（`/^readme(\.(md|txt|rst))?$/i`），有则自动 select 预览。导航切目录时 `setSelectedFile(null)` 先清空，加载完再由 `onLoad` 填入。

`remoteUrl`：`currentPath` 变化时请求 `/api/git-remote`，有值时在 Breadcrumb 行右侧渲染 GitHub SVG 图标（内联，`<a target="_blank">`），点击新标签页跳转；`e.stopPropagation()` 防止触发父行折叠。
