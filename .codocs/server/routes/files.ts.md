# server/routes/files.ts

`GET /api/files?path=` — 返回 `FileEntry[]`，目录优先，同类 `localeCompare` 字母序。路径经 `resolveSafePath` 安全解析；stat 失败时 size=0、mtime 为当前时间，不中断整体列举。
