import { useState, useEffect, useCallback } from 'react'
import type { FileEntry } from '../types'

interface UseFilesResult {
  data: FileEntry[]
  loading: boolean
  error: string | null
}

export function useFiles(path: string): UseFilesResult {
  const [data, setData] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable fetch function (doesn't change between renders)
  const fetchFiles = useCallback((currentPath: string, signal: AbortSignal) => {
    return fetch(`/api/files?path=${encodeURIComponent(currentPath)}`, { signal })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.error ?? `HTTP ${res.status}`) })
        return res.json()
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    setLoading(true)
    setError(null)
    setData([])

    // Initial fetch
    fetchFiles(path, abortController.signal)
      .then((json: FileEntry[]) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled || err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })

    // SSE watch for real-time updates
    const es = new EventSource(`/api/watch?path=${encodeURIComponent(path)}`)

    es.onmessage = (event) => {
      if (cancelled || event.data !== 'change') return
      // Re-fetch silently (no loading spinner for background refresh)
      fetchFiles(path, new AbortController().signal)
        .then((json: FileEntry[]) => {
          if (!cancelled) setData(json)
        })
        .catch(() => { /* silently ignore refresh errors */ })
    }

    // onerror: EventSource auto-reconnects, no action needed

    return () => {
      cancelled = true
      abortController.abort()
      es.close()
    }
  }, [path, fetchFiles])

  return { data, loading, error }
}
