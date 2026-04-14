---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/components/Breadcrumb.tsx
  source_hash: sha256:c56c260259d56c65b005539292ecbd646dab0073a6b2ff7d70f384fb10b4f351
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# Breadcrumb.tsx

将当前路径渲染为可点击面包屑，根节点固定显示 `~`。末节点渲染为加粗 `<span>`（不可点），祖先节点渲染为蓝色 `<button>`；按钮的 `onClick` 需 `e.stopPropagation()` 防止冒泡到父行的折叠切换处理器。

样式：Catppuccin Mocha 配色，横向可滚动防深路径溢出。
