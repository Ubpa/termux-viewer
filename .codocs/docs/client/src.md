# src

前端源码根目录。React 18 + TypeScript + Vite 构建，无路由（单页单视图）。

## 架构说明

数据流单向：`App` 持有全局状态 → 向下传 props → 子组件通过回调上报事件。`useFiles` 是唯一有副作用（fetch + SSE）的 hook，由 `FileList` 持有。`Preview` 自管理内容拉取状态，与 `FileList` 平级，互不依赖。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| components/ | 目录 | UI 展示组件（Breadcrumb、FileList、Preview） |
| hooks/ | 目录 | 自定义 Hook（useFiles：目录列表 + SSE 实时更新） |
| utils/ | 目录 | 工具函数（文件类型判断、大小格式化、图标） |
| App.tsx | 文件 | 根组件，持有 currentPath / selectedFile 状态，组装整体布局 |
| main.tsx | 文件 | React 挂载入口，StrictMode 包裹 App |
| types.ts | 文件 | 全局类型定义（FileEntry、ReadResponse、RenderType 等） |
