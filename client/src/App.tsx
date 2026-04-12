import { useState } from 'react'
import { Breadcrumb } from './components/Breadcrumb'
import { FileList } from './components/FileList'
import { Preview } from './components/Preview'
import type { FileEntry } from './types'

export function App() {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [listCollapsed, setListCollapsed] = useState(false)

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
        <Preview selectedFile={selectedFile} onScrollDown={() => setListCollapsed(true)} />
      </div>
    </div>
  )
}
