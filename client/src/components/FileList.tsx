import { useEffect } from 'react'
import type { FileEntry } from '../types'
import { useFiles } from '../hooks/useFiles'
import { formatSize, fileIcon } from '../utils/fileType'

interface FileListProps {
  path: string
  onNavigate: (path: string) => void
  onSelectFile: (file: FileEntry) => void
  selectedPath: string | null
  onLoad?: (files: FileEntry[]) => void
}

export function FileList({ path, onNavigate, onSelectFile, selectedPath, onLoad }: FileListProps) {
  const { data, loading, error } = useFiles(path)

  useEffect(() => {
    if (!loading && !error) onLoad?.(data)
  }, [data, loading, error])

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#181825',
        borderBottom: '1px solid #313244',
      }}
    >
      {loading && (
        <div style={{ padding: '20px', color: '#6c7086', textAlign: 'center' }}>
          加载中...
        </div>
      )}
      {error && (
        <div style={{ padding: '16px', color: '#f38ba8' }}>
          ⚠️ {error}
        </div>
      )}
      {!loading && !error && data.length === 0 && (
        <div style={{ padding: '20px', color: '#6c7086', textAlign: 'center' }}>
          （空目录）
        </div>
      )}
      {!loading && !error && data.map((entry) => (
        <div
          key={entry.path}
          onClick={() => entry.isDir ? onNavigate(entry.path) : onSelectFile(entry)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            cursor: 'pointer',
            borderBottom: '1px solid #1e1e2e',
            background: selectedPath === entry.path ? '#313244' : 'transparent',
            userSelect: 'none',
          }}
        >
          <span style={{ marginRight: '10px', fontSize: '16px' }}>{fileIcon(entry)}</span>
          <span
            style={{
              flex: 1,
              color: entry.isDir ? '#89b4fa' : '#cdd6f4',
              fontSize: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.name}
          </span>
          {!entry.isDir && (
            <span style={{ color: '#6c7086', fontSize: '14px', marginLeft: '8px', flexShrink: 0 }}>
              {formatSize(entry.size)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
