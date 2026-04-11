# FileList.tsx

展示目录文件列表。目录项点击触发导航，文件项点击触发选中预览，选中项背景高亮（`#313244`）。

数据来自 `useFiles(path)`，支持 SSE 实时刷新。容器 `height: 100%` 填满外层 wrapper（wrapper 由 App 控制折叠高度），内容超出时纵向滚动。
