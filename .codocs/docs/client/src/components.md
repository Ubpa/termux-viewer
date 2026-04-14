---
codocs:
  schema: 1
  source_type: dir
  source_path: client/src/components
  entries_hash: sha256:0f0c5d528669a767146336080a68199eea7beba323a2d0a424a3c0d7c181bcad
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# components

UI 组件目录，包含三个无状态/轻状态展示组件。所有组件样式均内联（Catppuccin Mocha 配色），无 CSS 模块依赖。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| Breadcrumb.tsx | 文件 | 路径面包屑导航，当前节点不可点，祖先节点可点击跳转 |
| FileList.tsx | 文件 | 目录文件列表，含实时刷新、选中高亮、目录/文件点击分发 |
| Preview.tsx | 文件 | 文件内容预览，按 renderType 分发到 markdown/code/image/text/binary 五种渲染路径 |
