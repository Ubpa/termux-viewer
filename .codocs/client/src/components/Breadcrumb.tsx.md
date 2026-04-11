# Breadcrumb.tsx

将当前路径渲染为可点击面包屑，根节点固定显示 `~`。末节点渲染为加粗 `<span>`（不可点），祖先节点渲染为蓝色 `<button>`；按钮的 `onClick` 需 `e.stopPropagation()` 防止冒泡到父行的折叠切换处理器。

样式：Catppuccin Mocha 配色，横向可滚动防深路径溢出。
