# Breadcrumb.tsx

## 职责
将当前路径渲染为可点击的面包屑导航栏，根节点固定显示为 `~`。

## Props

| 属性 | 类型 | 语义 |
|------|------|------|
| `currentPath` | `string` | 当前目录路径，`/` 表示根（Home）|
| `onNavigate` | `(path: string) => void` | 点击祖先节点时触发，携带该节点的绝对路径 |

## 路径解析约定

- `"/"` → 仅显示 `~`（单节点，不可点击）
- `"/projects/foo"` → `~ / projects / foo`，前两个可点击，末节点加粗不可点击
- 路径段通过 `split('/').filter(Boolean)` 分割，累积前缀构造每段的 `path`

## 末节点行为
末节点（当前所在目录）渲染为 `<span>`（加粗），其余节点渲染为 `<button>`（蓝色下划线）。

## 样式
Catppuccin Mocha 配色：背景 `#1e1e2e`，分隔符 `#6c7086`，链接 `#89b4fa`，当前节点 `#cdd6f4`。导航栏横向可滚动（`overflowX: auto`），防止深路径溢出。
