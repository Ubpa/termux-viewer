import { useState, useEffect } from 'react'
import { Breadcrumb } from './components/Breadcrumb'
import { FileList } from './components/FileList'
import { Preview } from './components/Preview'
import type { FileEntry } from './types'

export function App() {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [listCollapsed, setListCollapsed] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/git-remote?path=${encodeURIComponent(currentPath)}`)
      .then(r => r.ok ? r.json() : { url: null })
      .then((d: { url: string | null }) => setRemoteUrl(d.url))
      .catch(() => setRemoteUrl(null))
  }, [currentPath])

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
  }

  const handleLoad = (files: FileEntry[]) => {
    const readme = files.find(f => !f.isDir && /^readme(\.(md|txt|rst))?$/i.test(f.name))
    if (readme) setSelectedFile(readme)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: '#1e1e2e',
        borderBottom: '1px solid #313244',
        color: '#cba6f7',
        fontWeight: 700,
        fontSize: '15px',
        flexShrink: 0,
      }}>
        🗂 termux-viewer
      </div>

      {/* Breadcrumb + collapse toggle */}
      <div
        onClick={() => setListCollapsed(c => !c)}
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', background: '#1e1e2e', borderBottom: '1px solid #313244', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <Breadcrumb currentPath={currentPath} onNavigate={handleNavigate} />
          </div>
          {remoteUrl && (
            <a
              href={remoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={remoteUrl}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '6px 10px', color: '#cdd6f4', opacity: 0.7 }}
            >
              <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
        <span
          title={listCollapsed ? '展开文件列表' : '折叠文件列表'}
          style={{
            flexShrink: 0,
            color: '#6c7086',
            padding: '6px 12px',
            fontSize: '16px',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {listCollapsed ? '▼' : '▲'}
        </span>
      </div>

      {/* File list + Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          minHeight: listCollapsed ? 0 : '220px',
          maxHeight: listCollapsed ? 0 : '35vh',
          overflow: 'hidden',
          transition: 'min-height 0.2s ease, max-height 0.2s ease',
          flexShrink: 0,
        }}>
          <FileList
            path={currentPath}
            onNavigate={handleNavigate}
            onSelectFile={setSelectedFile}
            selectedPath={selectedFile?.path ?? null}
            onLoad={handleLoad}
          />
        </div>
        <Preview selectedFile={selectedFile} onScrollDown={() => setListCollapsed(true)} onScrollUpAtTop={() => setListCollapsed(false)} />
      </div>
    </div>
  )
}
