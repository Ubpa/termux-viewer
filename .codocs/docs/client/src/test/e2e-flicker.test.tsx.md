# e2e-flicker.test.tsx

MutationObserver 端到端闪烁检测——最严格的闪烁测试。

## 背景

之前的 readme-flicker 测试在固定时间点快照 DOM，可能错过瞬间闪烁。本文件使用 MutationObserver 持续监控，任何微秒级的"加载中..."出现都能捕获。

## 核心机制：FlickerDetector

`installFlickerDetector()` 返回的对象在 DOM 每次变化时检查是否包含"加载中..."文本：
- `markReady()` 标记初始加载完成，此后出现的才计为闪烁
- `flickerCount` 累计闪烁次数
- `stop()` 断开观察

## Mock 体系

- `makeFetchMock(opts)` 支持 filesDelayMs、readDelayMs、gitRemoteDelayMs、gitRemoteUrl 四个延迟/值参数
- `makeFiles(prefix)` 生成带路径前缀的 README.md + index.ts 文件列表
- `MockEventSource` 带 `closed` 标记，`findActiveWatchES()` 找最后一个未关闭实例（兼容 StrictMode double-invoke）

## 覆盖矩阵

6 种 timing 组合覆盖不同 race condition 路径：

| 组合 | 触发条件 |
|------|---------|
| 即时响应 | 所有 mock 零延迟 |
| read 慢 50ms | Preview fetch 延迟 |
| read 慢 100ms | 更长的 Preview fetch |
| files 慢 30ms + read 慢 50ms | 文件列表和 Preview 都延迟 |
| git-remote 慢 50ms | git-remote 请求竞争 |
| git-remote 返回 URL + 慢 | git-remote 有值时的额外 render |

每种组合触发 3 次 SSE，等 200ms 后断言 flickerCount === 0。

额外两个场景：
- 快速连续 5 次 SSE（间隔 50ms）——模拟真实 fs.watch 抖动
- 单次 SSE 后 500ms 内每 10ms 检查——细粒度扫描

## 坑

- 必须从 `client/` 目录运行 vitest，否则 setup.ts 不加载，jest-dom matchers 不可用
- StrictMode 下 EventSource 会有两个实例，必须用 `findActiveWatchES()` 找活跃的
