# hooks

自定义 Hook 目录，当前仅一个 hook。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| useFiles.ts | 文件 | 拉取目录文件列表并通过 SSE 实时监听变更，返回 `{ data, loading, error }` |
