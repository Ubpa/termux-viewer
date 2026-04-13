# test

vitest + @testing-library/react 测试目录，覆盖 SSE 闪烁 bug 和滚动交互。

## 内容

| 名称 | 类型 | 职责 |
|------|------|------|
| setup.ts | 文件 | 测试环境初始化：注册 jest-dom matchers，afterEach 自动 cleanup |
| readme-flicker.test.tsx | 文件 | 核心闪烁 bug 测试：SSE 触发后 Preview 不应出现"加载中..."（延迟 mock + fetch 计数） |
| strictmode.test.tsx | 文件 | React.StrictMode 下的闪烁测试，验证 double-invoke effects 不引入额外 bug |
| e2e-flicker.test.tsx | 文件 | MutationObserver 端到端闪烁检测：多种 timing 组合 × 持续 DOM 监控，捕获任何瞬间闪烁 |
| scroll-bounce.test.tsx | 文件 | 滚动收起/展开抖动测试：短/中/长内容场景下文件列表不应产生 collapse→expand 循环 |
