// @vitest-environment jsdom
/**
 * 复现 bug：根目录有 README 时，SSE 触发重新 fetch 导致 Preview 反复进入"加载中"状态
 *
 * 根因：每次 SSE 推送 → useFiles 重新 setData(newArray) → FileList useEffect 触发 onLoad
 *       → handleLoad 找到 readme → setSelectedFile(readme)
 *       但新数组中的 readme 对象是全新的引用，即使 path/name 完全相同，
 *       React useEffect([selectedFile]) 仍会检测到变化，导致 Preview 重新 fetch。
 *
 * 测试策略：
 *   /api/read 使用延迟 50ms 的 mock，让 setLoading(true) 的渲染能提交到 DOM。
 *   SSE 触发后，在 fetch 解析之前（10ms 时）检查 DOM：
 *     - BUG 存在时："加载中..." 出现在 DOM（Preview 重新进入加载状态）→ 断言 FAIL
 *     - BUG 修复后："加载中..." 不出现 → 断言 PASS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { App } from '../App'

// ── Mock EventSource (SSE) ────────────────────────────────────────────────
type ESListener = (event: MessageEvent) => void

class MockEventSource {
  static instances: MockEventSource[] = []
  onmessage: ESListener | null = null
  onerror: ((e: Event) => void) | null = null
  url: string
  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }
  close() {}
  /** Helper: simulate a 'change' SSE message */
  fireChange() {
    this.onmessage?.({ data: 'change' } as MessageEvent)
  }
}

// ── File fixtures ─────────────────────────────────────────────────────────

const README_FILE = { name: 'README.md', path: '/README.md', isDir: false, ext: '.md', size: 100 }
const OTHER_FILE  = { name: 'index.ts',  path: '/index.ts',  isDir: false, ext: '.ts', size: 200 }

// ── 即时 mock（用于基线测试）──────────────────────────────────────────────

function makeInstantFetchMock(readmeContent = '# Hello') {
  return vi.fn((url: string) => {
    const u = decodeURIComponent(url)

    if (u.includes('/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ ...README_FILE }, { ...OTHER_FILE }]),
      })
    }

    if (u.includes('/api/read')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'markdown', content: readmeContent }),
      })
    }

    if (u.includes('/api/git-remote')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: null }),
      })
    }

    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not found' }) })
  })
}

// ── 延迟 mock（用于 DOM 闪烁测试）────────────────────────────────────────
// /api/read 延迟 50ms resolve，使 setLoading(true) 的渲染能提交到 DOM

function makeDelayedFetchMock(readmeContent = '# Hello', readDelayMs = 50) {
  return vi.fn((url: string) => {
    const u = decodeURIComponent(url)

    if (u.includes('/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ ...README_FILE }, { ...OTHER_FILE }]),
      })
    }

    if (u.includes('/api/read')) {
      return new Promise<object>(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ type: 'markdown', content: readmeContent }),
        }), readDelayMs)
      )
    }

    if (u.includes('/api/git-remote')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: null }),
      })
    }

    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not found' }) })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('README 自动预览 — SSE 触发鬼畜 bug', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('基线：初始加载 README 应被自动选中并渲染内容', async () => {
    vi.stubGlobal('fetch', makeInstantFetchMock())

    render(<App />)

    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  // ── DOM 闪烁测试（核心）──────────────────────────────────────────────────
  //
  // 使用延迟 mock，让 setLoading(true) 的渲染能在 fetch 解析前提交到 DOM。
  // SSE 触发后 10ms 时检查 DOM："加载中..." 不应出现。
  //
  // BUG 存在时（handleLoad 无路径比较）：会出现 "加载中..." → 断言 FAIL
  // BUG 修复后（selectedFile?.path !== readme.path 守卫）：不出现 → 断言 PASS

  it('DOM 闪烁：SSE change 后 Preview 不应出现"加载中..."', async () => {
    vi.stubGlobal('fetch', makeDelayedFetchMock('# Hello', 50))

    render(<App />)

    // 等待初始加载完成，README 内容可见
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    // 确认此时没有"加载中..."
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    // 找到文件列表的 SSE 连接
    const fileListES = MockEventSource.instances.find(es => es.url.includes('/api/watch'))
    expect(fileListES).toBeDefined()

    // 触发 SSE change 事件，然后等 10ms（/api/read mock 要 50ms 才 resolve）
    // 这个时间窗口内如果 Preview 进入了加载状态，"加载中..." 会在 DOM 中可见
    await act(async () => {
      fileListES!.fireChange()
      await new Promise(r => setTimeout(r, 20))
    })

    // ★ 核心断言：Preview 不应重新进入加载状态
    // BUG 下：handleLoad 用新引用 setSelectedFile → Preview.useEffect 触发 → "加载中..." 出现
    // FIX 后：handleLoad 发现路径相同，跳过 setSelectedFile → 不触发 → "加载中..." 不出现
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    // 等待一切安定（不管是否重新 fetch，最终都应回到 heading 状态）
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('DOM 闪烁：SSE 连续触发 3 次，Preview 始终不应出现"加载中..."', async () => {
    vi.stubGlobal('fetch', makeDelayedFetchMock('# Hello', 50))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const fileListES = MockEventSource.instances.find(es => es.url.includes('/api/watch'))!

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fileListES.fireChange()
        await new Promise(r => setTimeout(r, 20))
      })

      // 每次 SSE 后都不应出现"加载中..."
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    }

    // 最终状态：README heading 仍然可见
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  // ── Fetch 调用计数测试（辅助证明）────────────────────────────────────────

  it('Fetch 计数：SSE change 不应触发 /api/read 重新 fetch', async () => {
    const fetchMock = makeInstantFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })

    const fetchCallsBefore = fetchMock.mock.calls.length

    const fileListES = MockEventSource.instances.find(es => es.url.includes('/api/watch'))
    expect(fileListES).toBeDefined()

    await act(async () => {
      fileListES!.fireChange()
      await new Promise(r => setTimeout(r, 100))
    })

    // /api/files 应该被再次调用（SSE 触发重新获取文件列表）
    const filesRefetched = fetchMock.mock.calls
      .slice(fetchCallsBefore)
      .some(([url]: [string]) => decodeURIComponent(url).includes('/api/files'))
    expect(filesRefetched).toBe(true)

    // /api/read 不应被再次调用（README 没有变化）
    const readRefetched = fetchMock.mock.calls
      .slice(fetchCallsBefore)
      .some(([url]: [string]) => decodeURIComponent(url).includes('/api/read'))
    expect(readRefetched).toBe(false)
  })

  it('Fetch 计数：SSE 连续触发 3 次，/api/read 调用次数应为 0', async () => {
    const fetchMock = makeInstantFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })

    const fileListES = MockEventSource.instances.find(es => es.url.includes('/api/watch'))!
    const fetchCallsBefore = fetchMock.mock.calls.length

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fileListES.fireChange()
        await new Promise(r => setTimeout(r, 50))
      })
    }

    const readCallCount = fetchMock.mock.calls
      .slice(fetchCallsBefore)
      .filter(([url]: [string]) => decodeURIComponent(url).includes('/api/read'))
      .length

    expect(readCallCount).toBe(0)
  })
})
