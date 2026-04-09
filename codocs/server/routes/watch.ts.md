# server/routes/watch.ts

## 职责

提供目录变更监听 API（`GET /api/watch`），以 SSE（Server-Sent Events）形式向客户端推送目录变化通知。

## 接口

### `GET /api/watch`

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 相对于 HOME 的目录路径 |

**响应**：SSE 流（`Content-Type: text/event-stream`）

| 事件 data | 含义 |
|-----------|------|
| `connected` | 连接建立成功（立即发送） |
| `change` | 监听目录发生变化（防抖后发送） |

**错误响应**（在 SSE 升级之前）

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 path / path 不是目录 |
| 403/500 | `resolveSafePath` 拒绝 |
| 404 | 目录不存在 |

## 关键设计

**SSE 原始写入**：建立连接后直接操作 `reply.raw`，绕过 Fastify 的响应封装，最后调用 `reply.hijack()` 阻止框架自动结束响应。响应头包含 `X-Accel-Buffering: no`，防止 nginx 等反代缓冲 SSE 数据。

**防抖（300ms）**：编辑器保存文件时通常触发多次 `fs.watch` 事件，防抖窗口 300ms 合并成单次 `change` 推送，避免客户端重复刷新。

**资源释放**：监听 `request.raw.socket` 的 `close` 事件，客户端断开时清除防抖定时器并关闭 `FSWatcher`，防止 inotify 句柄泄漏。

**watch 失败容错**：`fs.watch` 在 inotify 耗尽等情况下会抛出异常，此时直接 `reply.raw.end()` 优雅关闭，不崩溃进程。

**`persistent: false`**：`fs.watch` 使用 `{ persistent: false }`，确保 watcher 不阻止 Node.js 进程正常退出。

## 依赖

- `../utils/fs.js`：`resolveSafePath`
