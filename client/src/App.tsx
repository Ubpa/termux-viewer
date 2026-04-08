import { useState } from 'react'
import { Breadcrumb } from './components/Breadcrumb'
import { FileList } from './components/FileList'
import { Preview } from './components/Preview'
import type { FileEntry } from './types'

export function App() {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
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

      {/* Breadcrumb */}
      <div style={{ flexShrink: 0 }}>
        <Breadcrumb currentPath={currentPath} onNavigate={handleNavigate} />
      </div>

      {/* File list + Preview share remaining height equally */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FileList
          path={currentPath}
          onNavigate={handleNavigate}
          onSelectFile={setSelectedFile}
          selectedPath={selectedFile?.path ?? null}
        />
        <Preview selectedFile={selectedFile} />
      </div>
    </div>
  )
}
