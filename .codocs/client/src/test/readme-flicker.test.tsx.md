# readme-flicker.test.tsx

复现 SSE 触发导致 Preview 闪烁"加载中..."的 bug。这是第一批测试，用传统的固定时间点断言。

## Bug 根因

SSE 推送 → useFiles setData(newArray) → FileList useEffect 触发 onLoad → handleLoad 找到 README → setSelectedFile(readme)。新数组中 readme 是全新引用，React useEffect([selectedFile]) 检测到变化 → Preview 重新 fetch → setLoading(true) → 闪烁。

## Mock 体系

两种 fetch mock：

### makeInstantFetchMock
所有 API 即时 resolve。用于 fetch 调用计数测试——React 18 自动 batching 使 setLoading(true) + setLoading(false) 在同一微任务内完成，"加载中..."不渲染到 DOM，但 /api/read 调用可被计数。

### makeDelayedFetchMock
/api/read 延迟 readDelayMs（默认 50ms）resolve。强制 React 将 setLoading(true) 的渲染提交到 DOM，在 fetch resolve 前（20ms 时）检查 DOM 中是否出现"加载中..."。

## MockEventSource

模拟 SSE /api/watch 连接。`fireChange()` 触发 onmessage 回调。注册到 `instances` 数组，测试中通过 URL 查找对应实例。

## 测试场景

| 测试 | 类型 | 断言 |
|------|------|------|
| 基线 | 初始加载 | README heading 可见 |
| DOM 闪烁 × 1 | SSE 后 20ms | 无"加载中..." |
| DOM 闪烁 × 3 | 连续 SSE | 每次都无"加载中..." |
| Fetch 计数 × 1 | SSE 后 | /api/read 未被调用 |
| Fetch 计数 × 3 | 连续 SSE | /api/read 调用次数 = 0 |

## 坑

- 必须从 `client/` 目录运行，否则 setup.ts 不加载
- 即时 mock 下 DOM 断言无法检测闪烁（batching），因此同时保留 fetch 计数断言作为补充
