# components

UI 组件目录，包含三个无状态/轻状态展示组件。所有组件样式均内联（Catppuccin Mocha 配色），无 CSS 模块依赖。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| Breadcrumb.tsx | 文件 | 路径面包屑导航，当前节点不可点，祖先节点可点击跳转 |
| FileList.tsx | 文件 | 目录文件列表，含实时刷新、选中高亮、目录/文件点击分发 |
| Preview.tsx | 文件 | 文件内容预览，按 renderType 分发到 markdown/code/image/text/binary 五种渲染路径 |
