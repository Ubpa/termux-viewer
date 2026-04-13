# setup.ts

测试环境初始化。注册 `@testing-library/jest-dom` 的自定义 matchers（`toBeInTheDocument` 等），并在每个测试后自动 `cleanup()` 清理 DOM。

必须从 `client/` 目录运行 vitest 才能加载此文件（由 `vite.config.ts` 的 `test.setupFiles` 指定）。
