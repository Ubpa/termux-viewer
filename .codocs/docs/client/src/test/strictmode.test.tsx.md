# strictmode.test.tsx

验证 React.StrictMode 下 SSE 闪烁 bug 不存在。

## 为什么需要单独测试 StrictMode

真实 app（main.tsx）用 `<React.StrictMode>` 包裹 `<App />`，但 readme-flicker.test.tsx 直接 `render(<App />)`。StrictMode 会 double-invoke effects（mount → cleanup → remount），导致：
- useFiles 的初始 fetch 被 cancel 再重发
- EventSource 创建两个实例（第一个被 close）

如果测试只找第一个 EventSource，fireChange() 对已关闭实例无效，SSE 测试会假通过。

## Mock 体系

与 readme-flicker 共享相同模式的 MockEventSource 和 fetch mock，但：
- MockEventSource 增加 `closed` 标记
- `findActiveWatchES()` 从后往前找第一个未关闭的实例

## 测试场景

| 测试 | 断言 |
|------|------|
| StrictMode 基线 | README heading 在 5s 内可见 |
| StrictMode + SSE × 1 | SSE 后无"加载中..." |
| StrictMode + SSE × 3 | 连续 SSE 后始终无"加载中..." |
