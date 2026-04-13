import { useEffect, useRef, useState } from 'react'
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

interface ContextMenuState {
  x: number
  y: number
  entry: FileEntry
}

export function FileList({ path, onNavigate, onSelectFile, selectedPath, onLoad }: FileListProps) {
  const { data, loading, error } = useFiles(path)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Long-press support
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  useEffect(() => {
    if (!loading && !error) onLoad?.(data)
  }, [data, loading, error])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [contextMenu])

  const openMenu = (x: number, y: number, entry: FileEntry) => {
    // Clamp to viewport
    const menuW = 160, menuH = 90
    const cx = Math.min(x, window.innerWidth - menuW - 8)
    const cy = Math.min(y, window.innerHeight - menuH - 8)
    setContextMenu({ x: cx, y: cy, entry })
  }

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e.clientX, e.clientY, entry)
  }

  const handleTouchStart = (e: React.TouchEvent, entry: FileEntry) => {
    longPressFired.current = false
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      openMenu(x, y, entry)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = () => {
    // Cancel long press if finger moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleItemClick = (entry: FileEntry) => {
    // Suppress click after long press
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    entry.isDir ? onNavigate(entry.path) : onSelectFile(entry)
  }

  const handleCopyPath = () => {
    if (!contextMenu) return
    navigator.clipboard.writeText(contextMenu.entry.path).catch(() => {
      // Fallback: prompt with text
      window.prompt('复制路径:', contextMenu.entry.path)
    })
    setContextMenu(null)
  }

  const handleDelete = async () => {
    if (!contextMenu) return
    const { entry } = contextMenu
    const label = entry.isDir ? `目录 "${entry.name}" 及其所有内容` : `文件 "${entry.name}"`
    if (!window.confirm(`确定删除${label}？`)) {
      setContextMenu(null)
      return
    }
    setContextMenu(null)
    try {
      const res = await fetch(`/api/delete?path=${encodeURIComponent(entry.path)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(`删除失败: ${data.error}`)
      }
      // SSE will auto-refresh file list
    } catch (err: any) {
      alert(`删除失败: ${err.message}`)
    }
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#181825',
        borderBottom: '1px solid #313244',
        position: 'relative',
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
          onClick={() => handleItemClick(entry)}
          onContextMenu={(e) => handleContextMenu(e, entry)}
          onTouchStart={(e) => handleTouchStart(e, entry)}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
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

      {/* Context menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#313244',
            border: '1px solid #45475a',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 1000,
            minWidth: '140px',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={handleCopyPath}
            style={{
              padding: '10px 14px',
              color: '#cdd6f4',
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: '1px solid #45475a',
            }}
          >
            📋 复制路径
          </div>
          <div
            onClick={handleDelete}
            style={{
              padding: '10px 14px',
              color: '#f38ba8',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            🗑 删除
          </div>
        </div>
      )}
    </div>
  )
}
