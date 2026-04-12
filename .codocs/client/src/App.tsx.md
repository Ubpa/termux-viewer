# App.tsx

根组件，持有 `currentPath / selectedFile / listCollapsed` 三个状态，组装 Header / Breadcrumb行 / FileList / Preview。

Breadcrumb 所在行 `onClick` 切换 `listCollapsed`；FileList wrapper 用 `minHeight/maxHeight` 过渡实现折叠动画；Preview 的 `onScrollDown` 回调在向下滚动时自动折叠，`onScrollUpAtTop` 在顶部继续上滚时自动展开。

`handleLoad`：FileList 加载完成时回调，检测是否有 README（`/^readme(\.(md|txt|rst))?$/i`），有则自动 select 预览。导航切目录时 `setSelectedFile(null)` 先清空，加载完再由 `onLoad` 填入。
