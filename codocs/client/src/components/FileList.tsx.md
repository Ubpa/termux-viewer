# FileList.tsx

## 职责
展示指定目录的文件列表，目录项点击触发导航，文件项点击触发选中预览，高亮当前选中文件。

## Props

| 属性 | 类型 | 语义 |
|------|------|------|
| `path` | `string` | 当前目录路径，变化时重新拉取 |
| `onNavigate` | `(path: string) => void` | 点击目录项时调用 |
| `onSelectFile` | `(file: FileEntry) => void` | 点击文件项时调用 |
| `selectedPath` | `string \| null` | 高亮选中项，与 `entry.path` 对比 |

## 数据来源
通过 `useFiles(path)` hook 获取文件列表，支持实时 SSE 更新。加载/错误/空目录三种状态各有独立提示 UI。

## 渲染逻辑
- 目录项：名称蓝色（`#89b4fa`），点击触发 `onNavigate`
- 文件项：名称灰白色（`#cdd6f4`），右侧显示格式化文件大小，点击触发 `onSelectFile`
- 图标由 `fileIcon(entry)` 根据类型返回 emoji
- 选中项背景高亮 `#313244`

## 布局
固定高度 `33%`，内容超出时纵向滚动。与 Preview 共同填充剩余视口高度。
