import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { FileEntry, ReadResponse } from '../types'
import { getRenderType } from '../utils/fileType'

interface PreviewProps {
  selectedFile: FileEntry | null
  onScrollDown?: () => void
  onScrollUpAtTop?: () => void
}

export function Preview({ selectedFile, onScrollDown, onScrollUpAtTop }: PreviewProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)
  const lastScrollTop = useRef(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop > lastScrollTop.current && scrollTop > 10) {
      onScrollDown?.()
    } else if (scrollTop < lastScrollTop.current && scrollTop === 0) {
      onScrollUpAtTop?.()
    }
    lastScrollTop.current = scrollTop
  }

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
  }, [selectedFile?.path])

  const containerStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    background: '#11111b',
    padding: '16px',
    color: '#cdd6f4',
    fontSize: '16px',
    lineHeight: '1.6',
  }

  const container = (children: ReactNode, extraStyle?: CSSProperties) => (
    <div style={{ ...containerStyle, ...extraStyle }} onScroll={handleScroll}>
      {children}
    </div>
  )

  if (!selectedFile) {
    return container(
      <span style={{ color: '#6c7086' }}>点击上方文件预览内容</span>,
      { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    )
  }

  const renderType = getRenderType(selectedFile.ext, selectedFile.name)

  if (renderType === 'image') {
    return container(
      <>
        <img
          src={`/api/read?path=${encodeURIComponent(selectedFile.path)}`}
          alt={selectedFile.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => setImgError('图片加载失败（可能无权限访问）')}
        />
        {imgError && <div style={{ color: '#f38ba8', marginTop: '8px' }}>⚠️ {imgError}</div>}
      </>,
      { textAlign: 'center' }
    )
  }

  if (renderType === 'binary') {
    return container(
      <span>🚫 不支持预览此文件类型</span>,
      { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }
    )
  }

  if (loading) {
    return container(
      <span>加载中...</span>,
      { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7086' }
    )
  }

  if (error) {
    return container(
      <span>⚠️ {error}</span>,
      { color: '#f38ba8' }
    )
  }

  if (renderType === 'markdown') {
    return container(
      <div className="markdown-body">
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
    if (lines[lines.length - 1] === '') lines.pop()
    const lineNumbersHtml = lines
      .map((line, i) => `<span class="line-num">${i + 1}</span>${line}`)
      .join('\n')

    return container(
      <pre style={{ margin: 0, padding: '16px', overflowX: 'auto' }}>
        <code
          style={{ fontSize: '15px', fontFamily: 'monospace' }}
          dangerouslySetInnerHTML={{ __html: lineNumbersHtml }}
        />
      </pre>,
      { padding: 0 }
    )
  }

  // text
  return container(
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '15px' }}>
      {content}
    </pre>
  )
}