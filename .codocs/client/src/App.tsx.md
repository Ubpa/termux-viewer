# App.tsx

根组件，持有 `currentPath / selectedFile / listCollapsed` 三个状态，组装 Header / Breadcrumb行 / FileList / Preview。

Breadcrumb 所在行 `onClick` 切换 `listCollapsed`；FileList wrapper 用 `minHeight/maxHeight` 过渡实现折叠动画；Preview 的 `onScrollDown` 回调在向下滚动时自动折叠。
