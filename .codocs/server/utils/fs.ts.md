# server/utils/fs.ts

文件系统工具层：路径安全、SSH 检测、扩展名处理，及大小常量。

**`resolveSafePath`**：两阶段防御——字符串层拦截 `../` 穿越，`fs.realpath()` 防符号链接逃逸（越界 403，不存在 404）。

**`isSshPath`**：`read.ts` 在 `resolveSafePath` 前调用，确保 `.ssh/` 路径即使不存在也返回 403。

常量：`MAX_TEXT_BYTES=1MB`，`MAX_IMAGE_BYTES=10MB`。
