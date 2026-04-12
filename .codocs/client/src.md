# src

前端源码根目录。React 19 + TypeScript + Vite 构建，无路由（单页单视图）。

## 数据流

单向数据流：`App` 持有全局状态 → 向下传 props → 子组件通过回调上报事件。

- `App` 拥有 `currentPath`、`selectedFile`、`listCollapsed`、`remoteUrl` 四个状态
- `useFiles` 是唯一有副作用（fetch + SSE）的 hook，由 `FileList` 持有
- `Preview` 自管理内容拉取状态（loading / content / error）

## SSE 实时刷新

`useFiles` 建立 `/api/watch` SSE 连接，收到 `change` 事件后静默重新 fetch 文件列表（不触发 loading spinner）。新文件列表到达后，`FileList` 的 `onLoad` 回调通知 `App`，`App.handleLoad` 在目录中有 README 时自动选中。

## 关键设计决策

- `Preview.useEffect` 依赖 `[selectedFile?.path]` 而非 `[selectedFile]`：SSE 刷新时 handleLoad 可能传入同 path 不同引用的 FileEntry 对象，用 path 字符串比较避免不必要的重新 fetch 导致闪烁
- `FileList.useEffect` 的 `onLoad` 不在依赖数组中：有意为之，避免每次 App render 都重新触发 onLoad

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| components/ | 目录 | UI 组件（Breadcrumb、FileList、Preview） |
| hooks/ | 目录 | 自定义 Hook（useFiles） |
| utils/ | 目录 | 工具函数（文件类型判断、大小格式化、图标） |
| test/ | 目录 | vitest 测试（SSE 闪烁 bug 覆盖，含 MutationObserver 端到端检测） |
| App.tsx | 文件 | 根组件，持有 currentPath / selectedFile / listCollapsed |
| main.tsx | 文件 | React 挂载入口，StrictMode 包裹 App |
| types.ts | 文件 | 全局类型定义（FileEntry、ReadResponse、ErrorResponse、RenderType） |
| index.css | 文件 | 全局样式（Catppuccin Mocha 配色基础、滚动条、markdown-body） |
