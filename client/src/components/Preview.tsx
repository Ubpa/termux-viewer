import { useEffect, useState, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { FileEntry, ReadResponse } from '../types'
import { getRenderType } from '../utils/fileType'

interface PreviewProps {
  selectedFile: FileEntry | null
}

export function Preview({ selectedFile }: PreviewProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)

  useEffect(() => {
    setImgError(null)   // always clear image-specific error on file change

    if (!selectedFile) {
      setContent('')
      setError(null)
      return
    }

    const renderType = getRenderType(selectedFile.ext, selectedFile.name)
    if (renderType === 'image' || renderType === 'binary') {
      setContent('')
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setContent('')

    fetch(`/api/read?path=${encodeURIComponent(selectedFile.path)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e: any) => { throw new Error(e.error ?? `HTTP ${res.status}`) })
        return res.json()
      })
      .then((data: ReadResponse) => {
        if (!cancelled) {
          if (data.type === 'binary') {
            setError('不支持预览此文件类型')
          } else {
            setContent(data.content)
          }
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
  }, [selectedFile])

  const containerStyle: CSSProperties = {
    height: '67%',
    overflowY: 'auto',
    background: '#11111b',
    padding: '16px',
    color: '#cdd6f4',
    fontSize: '16px',
    lineHeight: '1.6',
  }

  if (!selectedFile) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        点击上方文件预览内容
      </div>
    )
  }

  const renderType = getRenderType(selectedFile.ext, selectedFile.name)

  if (renderType === 'image') {
    return (
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        <img
          src={`/api/read?path=${encodeURIComponent(selectedFile.path)}`}
          alt={selectedFile.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => setImgError('图片加载失败（可能无权限访问）')}
        />
        {imgError && <div style={{ color: '#f38ba8', marginTop: '8px' }}>⚠️ {imgError}</div>}
      </div>
    )
  }

  if (renderType === 'binary') {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        🚫 不支持预览此文件类型
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }}>
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, color: '#f38ba8' }}>
        ⚠️ {error}
      </div>
    )
  }

  if (renderType === 'markdown') {
    return (
      <div style={containerStyle} className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    )
  }

  if (renderType === 'code') {
    const lang = selectedFile.ext.replace('.', '')
    const highlighted = hljs.getLanguage(lang)
      ? hljs.highlight(content, { language: lang }).value
      : hljs.highlightAuto(content).value

    const lines = highlighted.split('\n')
    // Remove trailing empty line caused by final newline
    if (lines[lines.length - 1] === '') lines.pop()
    const lineNumbersHtml = lines
      .map((line, i) => `<span class="line-num">${i + 1}</span>${line}`)
      .join('\n')

    return (
      <div style={{ ...containerStyle, padding: 0 }}>
        <pre style={{ margin: 0, padding: '16px', overflowX: 'auto' }}>
          <code
            style={{ fontSize: '15px', fontFamily: 'monospace' }}
            dangerouslySetInnerHTML={{ __html: lineNumbersHtml }}
          />
        </pre>
      </div>
    )
  }

  // text
  return (
    <div style={containerStyle}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '15px' }}>
        {content}
      </pre>
    </div>
  )
}
