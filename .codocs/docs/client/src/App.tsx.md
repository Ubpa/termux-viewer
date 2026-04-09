# App.tsx

## 职责
应用根组件，持有全局导航状态（`currentPath` + `selectedFile`），组装 Header / Breadcrumb / FileList / Preview 四个区域。

## 状态

| 状态 | 初始值 | 语义 |
|------|--------|------|
| `currentPath` | `"/"` | 当前浏览目录，对应 Termux HOME 下的路径 |
| `selectedFile` | `null` | 当前选中的文件，传给 Preview 渲染 |

## 导航约定
`handleNavigate` 同时重置 `selectedFile` 为 `null`，确保切换目录后预览区清空，不保留上一目录的选中状态。

## 布局结构
```
┌─────────────────────┐  ← Header（固定高度，flexShrink:0）
├─────────────────────┤  ← Breadcrumb（固定高度，flexShrink:0）
│  FileList (33%)     │  ┐
│─────────────────────│  ├ flex:1，共享剩余视口高度
│  Preview (67%)      │  ┘
└─────────────────────┘
```
外层容器 `height: 100vh`，内部 flex 列布局。FileList/Preview 的百分比是其自身 CSS 属性，不由 App 控制。
