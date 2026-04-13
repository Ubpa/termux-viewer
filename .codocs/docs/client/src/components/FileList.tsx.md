# FileList.tsx

展示目录文件列表。目录项点击触发导航，文件项点击触发选中预览，选中项背景高亮（`#313244`）。

数据来自 `useFiles(path)`，支持 SSE 实时刷新。容器 `height: 100%` 填满外层 wrapper（wrapper 由 App 控制折叠高度），内容超出时纵向滚动。

`onLoad?: (files: FileEntry[]) => void`：加载完成（非 loading、非 error）时回调，供 App 做 README 自动预览。注意 `onLoad` 不在 useEffect deps 中（有意为之，避免每次 App render 都触发回调）。

## 长按上下文菜单

长按（500ms）或右键触发上下文菜单，提供两个操作：

- **复制路径**：`navigator.clipboard.writeText()`，clipboard API 不可用时 fallback 到 `window.prompt()`
- **删除**：`window.confirm()` 确认后调 `DELETE /api/delete`，SSE 自动刷新列表

### 长按实现

- `onTouchStart` 启动 500ms 定时器，记录触点坐标
- `onTouchMove` 取消定时器（手指移动 = 不是长按）
- `onTouchEnd` 清除定时器
- `longPressFired` ref 标记是否已触发长按，`handleItemClick` 中检查此标记以抑制长按后的误触 click

### 菜单定位

`openMenu(x, y)` 将坐标 clamp 到 viewport 内，防止菜单超出屏幕边缘。点击/触摸菜单外区域通过 document 级别事件监听关闭菜单。
