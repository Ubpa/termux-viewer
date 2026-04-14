---
codocs:
  schema: 1
  source_type: file
  source_path: client/src/test/scroll-bounce.test.tsx
  source_hash: sha256:18bc24531689d3b322f47c7277943610b6b13a8e638009b663cc8c131fbc2b5a
  explicit_deps: []
  dep_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  hash_mode: text-lf-sha256
  verified_at: '2026-04-14T22:47:40.458176+08:00'
---
# scroll-bounce.test.tsx

滚动交互测试：验证文件列表收起/展开不会因内容长度不足产生抖动。

## 测试策略

手动 mock `scrollTop`、`scrollHeight`、`clientHeight` 并 dispatch scroll 事件，模拟 jsdom 中无法自然产生的 layout 行为。

## 关键辅助函数

- `simulateScroll(container, {scrollTop, scrollHeight, clientHeight})` — 设置三个属性并触发 scroll 事件
- `findPreviewContainer()` — 按 background/overflowY 样式特征找到 Preview 滚动容器
- `isFileListCollapsed()` — 检查 ▼（收起）/▲（展开）标记

## 场景覆盖

| 场景 | scrollHeight vs clientHeight+220 | 期望 |
|------|--------------------------------|------|
| 短内容（remainingScroll ≤ 50） | 不够 | 不收起 |
| 中等内容（remainingScroll > 50 但收起后不够） | scrollHeight < clientHeight+220 | 不收起 |
| 长内容（remainingScroll > 50 且收起后够） | scrollHeight > clientHeight+220 | 收起 |
| 长内容收起后上滑到顶 | — | 展开 |
| 中等内容抖动序列 | — | 不发生 true→false 振荡 |

## 坑

- jsdom 无 layout 引擎：scrollTop/scrollHeight/clientHeight 全部需要手动 `Object.defineProperty` mock
- React scroll 事件通过 `container.dispatchEvent(new Event('scroll', {bubbles: true}))` 触发
