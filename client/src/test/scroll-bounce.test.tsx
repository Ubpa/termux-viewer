// @vitest-environment jsdom
/**
 * 测试滚动交互：短内容不应触发收起，长内容正常收起/展开。
 *
 * 核心逻辑：handleScroll 在触发 onScrollDown 前检查 remainingScroll，
 * 如果剩余可滚动距离 ≤ 50px，不收起（因为收起后容器变高内容不够长，
 * 就再也没法通过滚动展开了）。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { App } from '../App'

// ── Mock EventSource ─────────────────────────────────────────────────────
class MockEventSource {
  static instances: MockEventSource[] = []
  onmessage: ((e: MessageEvent) => void) | null = null
  url: string
  closed = false
  constructor(url: string) { this.url = url; MockEventSource.instances.push(this) }
  close() { this.closed = true }
}

// ── Fixtures ─────────────────────────────────────────────────────────────
const SHORT_MD = { name: 'README.md', path: '/README.md', isDir: false, ext: '.md', size: 30 }
const OTHER    = { name: 'index.ts',  path: '/index.ts',  isDir: false, ext: '.ts', size: 200 }

function makeFetchMock(mdContent: string) {
  return vi.fn((url: string) => {
    const u = decodeURIComponent(url)
    if (u.includes('/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ ...SHORT_MD }, { ...OTHER }]),
      })
    }
    if (u.includes('/api/read')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'markdown', content: mdContent }),
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

// ── Helpers ──────────────────────────────────────────────────────────────
function findPreviewContainer(): HTMLElement | null {
  const elements = document.querySelectorAll('div')
  for (const el of elements) {
    if (el.style.background === 'rgb(17, 17, 27)' && el.style.overflowY === 'auto') {
      return el
    }
  }
  return null
}

/**
 * 模拟 scroll 事件，同时设置 scrollTop、scrollHeight、clientHeight。
 * jsdom 没有真实 layout，需要手动 mock 这些属性。
 */
function simulateScroll(container: HTMLElement, opts: {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}) {
  Object.defineProperty(container, 'scrollTop', { value: opts.scrollTop, writable: true, configurable: true })
  Object.defineProperty(container, 'scrollHeight', { value: opts.scrollHeight, writable: true, configurable: true })
  Object.defineProperty(container, 'clientHeight', { value: opts.clientHeight, writable: true, configurable: true })
  container.dispatchEvent(new Event('scroll', { bubbles: true }))
}

function isFileListCollapsed(): boolean {
  return document.body.textContent?.includes('▼') ?? false
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('滚动收起/展开文件列表', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('短内容：下滑时 remainingScroll 小，不应收起文件列表', async () => {
    vi.stubGlobal('fetch', makeFetchMock('# Hi\n\nShort.'))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hi' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // 短内容：scrollHeight 略大于 clientHeight，用户滑到 scrollTop=20 时
    // 剩余距离 = 320 - 20 - 280 = 20px < 50 阈值 → 不收起
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 320, clientHeight: 280 })
    })

    expect(isFileListCollapsed()).toBe(false)
  }, 10000)

  it('长内容：下滑时 remainingScroll 大，应正常收起', async () => {
    const longMd = '# Title\n\n' + Array(100).fill('Long paragraph content here.\n').join('\n')
    vi.stubGlobal('fetch', makeFetchMock(longMd))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // 长内容：scrollHeight 远大于 clientHeight
    // 剩余距离 = 2000 - 20 - 280 = 1700px > 50 阈值 → 收起
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 2000, clientHeight: 280 })
    })

    expect(isFileListCollapsed()).toBe(true)
  }, 10000)

  it('长内容：收起后上滑到顶应展开', async () => {
    const longMd = '# Title\n\n' + Array(100).fill('Long paragraph content here.\n').join('\n')
    vi.stubGlobal('fetch', makeFetchMock(longMd))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // 下滑收起
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 2000, clientHeight: 280 })
    })
    expect(isFileListCollapsed()).toBe(true)

    // 继续下滑
    await act(async () => {
      simulateScroll(container, { scrollTop: 100, scrollHeight: 2000, clientHeight: 500 })
    })

    // 用户上滑回到顶部
    await act(async () => {
      simulateScroll(container, { scrollTop: 50, scrollHeight: 2000, clientHeight: 500 })
    })
    await act(async () => {
      simulateScroll(container, { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 })
    })

    expect(isFileListCollapsed()).toBe(false)
  }, 10000)

  it('边界：remainingScroll 刚好等于 50，不收起', async () => {
    vi.stubGlobal('fetch', makeFetchMock('# Hi\n\nMedium.'))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hi' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // remainingScroll = 570 - 20 - 500 = 50 → 恰好不够 > 50 → 不收起
    // scrollHeight(570) < clientHeight(500) + 220 = 720 → 也不收起（双重保护）
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 570, clientHeight: 500 })
    })

    expect(isFileListCollapsed()).toBe(false)
  }, 10000)

  it('边界：两个条件都满足时才收起', async () => {
    vi.stubGlobal('fetch', makeFetchMock('# Hi\n\nMedium.'))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hi' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // scrollHeight=800, clientHeight=300, scrollTop=20
    // remainingScroll = 800 - 20 - 300 = 480 > 50 ✓
    // scrollHeight(800) > clientHeight(300) + 220 = 520 ✓ → 收起
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 800, clientHeight: 300 })
    })

    expect(isFileListCollapsed()).toBe(true)
  }, 10000)

  // ── 中等长度场景（routes.md ~581B）────────────────────────────────
  // 文件列表展开时内容刚好能滚一些（remainingScroll > 50），触发收起。
  // 但收起后容器变高约 220px，内容不够长了，scrollTop 回弹到 0 → 展开。
  // 产生一次收起→立即展开的抖动。

  it('中等内容：展开时 remainingScroll > 50 但收起后不够长，不应收起', async () => {
    vi.stubGlobal('fetch', makeFetchMock('# Routes\n\n' + '| col | col |\n|---|---|\n'.repeat(8)))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Routes' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!

    // 模拟真实场景：文件列表展开时
    //   clientHeight = 300（Preview 容器高度，受文件列表挤压）
    //   scrollHeight = 500（内容总高度）
    //   scrollTop = 20（用户往下滑了一点）
    //   remainingScroll = 500 - 20 - 300 = 180 > 50 → 当前逻辑会收起
    //
    // 收起后文件列表释放约 220px 空间：
    //   clientHeight ≈ 300 + 220 = 520
    //   scrollHeight = 500（内容不变）
    //   500 < 520 → 内容不够长 → scrollTop 回弹到 0 → 展开 → 抖动！
    //
    // 正确行为：检测到收起后内容会不够长，不触发收起。

    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 500, clientHeight: 300 })
    })

    // ★ 核心断言：不应收起
    // BUG: remainingScroll=180 > 50 → 收起 → 回弹 → 展开 → 抖动
    // FIX: 应考虑收起后容器增大，内容不够长则不收起
    expect(isFileListCollapsed()).toBe(false)
  }, 10000)

  it('中等内容：收起→回弹→展开 抖动序列不应发生', async () => {
    vi.stubGlobal('fetch', makeFetchMock('# Routes\n\n' + '| col | col |\n|---|---|\n'.repeat(8)))

    render(<React.StrictMode><App /></React.StrictMode>)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Routes' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const container = findPreviewContainer()!
    const collapseHistory: boolean[] = []

    // 下滑（中等内容）
    await act(async () => {
      simulateScroll(container, { scrollTop: 20, scrollHeight: 500, clientHeight: 300 })
    })
    collapseHistory.push(isFileListCollapsed())

    // 如果收起了，模拟回弹
    if (isFileListCollapsed()) {
      await act(async () => {
        simulateScroll(container, { scrollTop: 0, scrollHeight: 500, clientHeight: 520 })
      })
      collapseHistory.push(isFileListCollapsed())
    }

    // 不应出现 true → false 的抖动
    const hasBounce = collapseHistory.length >= 2 &&
      collapseHistory[0] === true && collapseHistory[1] === false
    expect(hasBounce).toBe(false)
  }, 10000)
})

