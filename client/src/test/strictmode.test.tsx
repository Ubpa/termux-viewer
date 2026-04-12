// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { App } from '../App'

type ESListener = (event: MessageEvent) => void
class MockEventSource {
  static instances: MockEventSource[] = []
  onmessage: ESListener | null = null
  url: string
  closed = false
  constructor(url: string) { this.url = url; MockEventSource.instances.push(this) }
  close() { this.closed = true }
  fireChange() { this.onmessage?.({ data: 'change' } as MessageEvent) }
}

const README_FILE = { name: 'README.md', path: '/README.md', isDir: false, ext: '.md', size: 100 }
const OTHER_FILE  = { name: 'index.ts',  path: '/index.ts',  isDir: false, ext: '.ts', size: 200 }

function makeDelayedFetchMock(readDelayMs = 50) {
  return vi.fn((url: string) => {
    const u = decodeURIComponent(url)
    if (u.includes('/api/files')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([{ ...README_FILE }, { ...OTHER_FILE }]) })
    }
    if (u.includes('/api/read')) {
      return new Promise<object>(resolve =>
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ type: 'markdown', content: '# Hello' }) }), readDelayMs)
      )
    }
    if (u.includes('/api/git-remote')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ url: null }) })
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not found' }) })
  })
}

/** 找到最后一个未关闭的 /api/watch EventSource（StrictMode 下第一个会被 close） */
function findActiveWatchES() {
  return [...MockEventSource.instances]
    .reverse()
    .find(es => es.url.includes('/api/watch') && !es.closed)
}

describe('React.StrictMode 下的 SSE 闪烁 bug', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('StrictMode 基线：初始加载完成后应显示 README heading', async () => {
    vi.stubGlobal('fetch', makeDelayedFetchMock(50))

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('StrictMode + SSE change: Preview 不应出现"加载中..."', async () => {
    vi.stubGlobal('fetch', makeDelayedFetchMock(50))

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    const fileListES = findActiveWatchES()
    expect(fileListES).toBeDefined()

    await act(async () => {
      fileListES!.fireChange()
      await new Promise(r => setTimeout(r, 20))
    })

    // 核心断言：SSE 触发后不应出现"加载中..."
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('StrictMode + SSE 连续 3 次: Preview 始终不应出现"加载中..."', async () => {
    vi.stubGlobal('fetch', makeDelayedFetchMock(50))

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 5000 })

    const fileListES = findActiveWatchES()!

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fileListES.fireChange()
        await new Promise(r => setTimeout(r, 20))
      })
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    }

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
