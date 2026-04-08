import { useState, useEffect } from 'react'
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setData([])

    fetch(`/api/files?path=${encodeURIComponent(path)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => { throw new Error(e.error ?? `HTTP ${res.status}`) })
        return res.json()
      })
      .then((json: FileEntry[]) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [path])

  return { data, loading, error }
}
