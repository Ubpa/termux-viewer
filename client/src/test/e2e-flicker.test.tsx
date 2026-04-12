// @vitest-environment jsdom
/**
 * 端到端复现：根目录 README 闪烁 bug
 *
 * 策略：
 * - 用 MutationObserver 持续监控 DOM，捕获任何瞬间出现的"加载中..."
 * - 对比根目录 (/) 和子目录 (/sub/) 的行为差异
 * - 使用 StrictMode 匹配真实 app
 * - 多种 timing 组合覆盖 race condition
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { App } from '../App'

// ── Mock EventSource ─────────────────────────────────────────────────────
type ESListener = (event: MessageEvent) => void

class MockEventSource {
  static instances: MockEventSource[] = []
  onmessage: ESListener | null = null
  onerror: ((e: Event) => void) | null = null
  url: string
  closed = false
  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }
  close() { this.closed = true }
  fireChange() { this.onmessage?.({ data: 'change' } as MessageEvent) }
}

function findActiveWatchES() {
  return [...MockEventSource.instances]
    .reverse()
    .find(es => es.url.includes('/api/watch') && !es.closed)
}

// ── File fixtures ────────────────────────────────────────────────────────

function makeFiles(prefix: string) {
  return [
    { name: 'README.md', path: `${prefix}README.md`, isDir: false, ext: '.md', size: 100 },
    { name: 'index.ts',  path: `${prefix}index.ts`,  isDir: false, ext: '.ts', size: 200 },
  ]
}

// ── Fetch mock with configurable delays ──────────────────────────────────

function makeFetchMock(opts: {
  filesDelayMs?: number
  readDelayMs?: number
  gitRemoteUrl?: string | null
  gitRemoteDelayMs?: number
} = {}) {
  const { filesDelayMs = 0, readDelayMs = 0, gitRemoteUrl = null, gitRemoteDelayMs = 0 } = opts

  return vi.fn((url: string, init?: RequestInit) => {
    const u = decodeURIComponent(url)

    // Extract path param
    const pathMatch = u.match(/[?&]path=([^&]*)/)
    const reqPath = pathMatch ? pathMatch[1] : '/'

    if (u.includes('/api/files')) {
      const prefix = reqPath === '/' ? '/' : reqPath
      const resp = { ok: true, json: () => Promise.resolve(makeFiles(prefix).map(f => ({ ...f }))) }
      return filesDelayMs > 0
        ? new Promise(resolve => setTimeout(() => resolve(resp), filesDelayMs))
        : Promise.resolve(resp)
    }

    if (u.includes('/api/read')) {
      const resp = { ok: true, json: () => Promise.resolve({ type: 'markdown', content: '# Hello' }) }
      return readDelayMs > 0
        ? new Promise(resolve => setTimeout(() => resolve(resp), readDelayMs))
        : Promise.resolve(resp)
    }

    if (u.includes('/api/git-remote')) {
      const resp = { ok: true, json: () => Promise.resolve({ url: gitRemoteUrl }) }
      return gitRemoteDelayMs > 0
        ? new Promise(resolve => setTimeout(() => resolve(resp), gitRemoteDelayMs))
        : Promise.resolve(resp)
    }

    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not found' }) })
  })
}

// ── MutationObserver-based flicker detector ──────────────────────────────

/**
 * 在 DOM 上安装一个观察器，捕获任何"加载中..."文本的出现。
 * 返回一个对象：
 *   flickerCount: 初始加载完成后"加载中..."出现的次数
 *   stop(): 停止观察
 *   markReady(): 标记初始加载完成，之后出现的才算 flicker
 */
function installFlickerDetector() {
  let ready = false
  let flickerCount = 0
  let flickerTimestamps: number[] = []

  const check = () => {
    if (!ready) return
    const el = document.querySelector('body')
    if (el && el.textContent?.includes('加载中...')) {
      flickerCount++
      flickerTimestamps.push(Date.now())
    }
  }

  const observer = new MutationObserver(() => check())
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })

  return {
    get flickerCount() { return flickerCount },
    get flickerTimestamps() { return flickerTimestamps },
    markReady() { ready = true },
    stop() { observer.disconnect() },
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('根目录 README 闪烁 — 端到端复现', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // ── 核心复现：根目录 SSE 触发后，MutationObserver 是否捕获到"加载中..." ──

  // 测试矩阵：不同 timing 组合 × 根目录/子目录
  const timingCombos = [
    { label: '即时响应', filesDelayMs: 0, readDelayMs: 0, gitRemoteDelayMs: 0 },
    { label: 'read 慢 50ms', filesDelayMs: 0, readDelayMs: 50, gitRemoteDelayMs: 0 },
    { label: 'read 慢 100ms', filesDelayMs: 0, readDelayMs: 100, gitRemoteDelayMs: 0 },
    { label: 'files 慢 30ms + read 慢 50ms', filesDelayMs: 30, readDelayMs: 50, gitRemoteDelayMs: 0 },
    { label: 'git-remote 慢 50ms', filesDelayMs: 0, readDelayMs: 50, gitRemoteDelayMs: 50 },
    { label: 'git-remote 返回 URL + 慢', filesDelayMs: 0, readDelayMs: 50, gitRemoteDelayMs: 30, gitRemoteUrl: 'https://github.com/test/repo' },
  ]

  for (const combo of timingCombos) {
    it(`根目录 [${combo.label}]: SSE change 后不应闪烁`, async () => {
      const fetchMock = makeFetchMock({
        filesDelayMs: combo.filesDelayMs,
        readDelayMs: combo.readDelayMs,
        gitRemoteDelayMs: combo.gitRemoteDelayMs,
        gitRemoteUrl: (combo as any).gitRemoteUrl ?? null,
      })
      vi.stubGlobal('fetch', fetchMock)

      const detector = installFlickerDetector()

      render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      )

      // 等待初始加载完成
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
      }, { timeout: 5000 })

      // 标记初始加载完成，此后的"加载中..."才算闪烁
      detector.markReady()

      const fileListES = findActiveWatchES()
      expect(fileListES).toBeDefined()

      // 触发 SSE 并等待足够长时间让所有异步操作完成
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fileListES!.fireChange()
          // 等待比最慢的 mock 更长的时间
          await new Promise(r => setTimeout(r, 200))
        })
      }

      // 再等一会让所有微任务完成
      await act(async () => {
        await new Promise(r => setTimeout(r, 100))
      })

      detector.stop()

      // 核心断言：不应有任何闪烁
      expect(detector.flickerCount).toBe(0)

      // README 仍然可见
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, 15000)
  }

  // ── 对比：子目录不应闪烁 ──────────────────────────────────────────────

  // 注意：App 初始就是根目录，要测试子目录需要先导航。
  // 但 App 没暴露导航接口，我们通过点击目录项来导航。
  // 不过这样测试太复杂。换个思路：直接看根目录闪烁的频率。

  // ── 快速连续 SSE（模拟真实 fs.watch 行为）──────────────────────────────

  it('根目录: 快速连续 5 次 SSE（间隔 50ms），不应闪烁', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ readDelayMs: 80 }))

    const detector = installFlickerDetector()

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    detector.markReady()

    const fileListES = findActiveWatchES()!

    // 快速连续触发 SSE
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fileListES.fireChange()
        await new Promise(r => setTimeout(r, 50))
      }
      // 等待所有操作完成
      await new Promise(r => setTimeout(r, 300))
    })

    detector.stop()

    expect(detector.flickerCount).toBe(0)
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
  }, 15000)

  // ── 单次 SSE 详细 timing 检查 ─────────────────────────────────────────

  it('根目录: 单次 SSE 后持续 500ms 内的每个 tick 都不应出现"加载中..."', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ readDelayMs: 50 }))

    const detector = installFlickerDetector()

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    detector.markReady()

    const fileListES = findActiveWatchES()!

    // 触发一次 SSE，然后每 10ms 检查一次 DOM，持续 500ms
    await act(async () => {
      fileListES.fireChange()
      for (let t = 0; t < 50; t++) {
        await new Promise(r => setTimeout(r, 10))
      }
    })

    detector.stop()

    expect(detector.flickerCount).toBe(0)
  }, 15000)
})
