# Preview.tsx

## 职责
根据选中文件的类型分发到对应渲染模式（image / markdown / code / text / binary），并通过 `/api/read` 拉取文件内容。

## Props

| 属性 | 类型 | 语义 |
|------|------|------|
| `selectedFile` | `FileEntry \| null` | 当前选中文件，null 时显示占位提示 |

## 渲染分支

| renderType | 渲染方式 | 关键处理 |
|---|---|---|
| `image` | `<img>` 直接指向 `/api/read?path=...` | 不发 fetch，onError 捕获加载失败 |
| `binary` | 占位提示"不支持预览" | 不发 fetch |
| `markdown` | `<ReactMarkdown remarkPlugins={[remarkGfm]}>` | 直接渲染为 React 组件树，无 dangerouslySetInnerHTML，支持 GFM（表格/任务列表/删除线） |
| `code` | `highlight.js` 高亮 + 行号注入 | 自动语言检测（`highlightAuto` fallback），末尾空行去除 |
| `text` | `<pre>` 纯文本，`word-break: break-all` | 无高亮 |

## 数据获取
- `useEffect` 依赖 `selectedFile`，文件切换时取消前一个请求（`cancelled` flag）
- image/binary 类型跳过 fetch，直接走纯前端渲染
- `/api/read` 返回 `ReadResponse`，若 `type === 'binary'` 则显示不支持提示（服务端判断与前端判断的双重兜底）

## 行号实现
通过字符串拼接而非独立 DOM 列：将高亮后的 HTML 按 `\n` 分行，每行前插入 `<span class="line-num">{n}</span>`，再 join 后塞入 `dangerouslySetInnerHTML`。CSS 通过 `.line-num` 类控制样式。

## 注意
- `imgError` 状态独立于 `error`，仅在图片加载失败时触发，且在文件切换时始终清空
- `cancelled` flag 防止组件卸载或路径切换后的异步回调修改 state
