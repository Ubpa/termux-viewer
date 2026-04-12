import type { RenderType } from '../types'

const MARKDOWN_EXTS = new Set(['.md', '.markdown'])
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])
const CODE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.sh', '.json',
  '.yaml', '.yml', '.toml', '.css', '.html', '.xml',
  '.c', '.cpp', '.h', '.hpp', '.hxx', '.inl', '.go', '.rs', '.java', '.rb', '.php',
  '.ini', '.conf', '.sql', '.dockerfile', '.makefile', '.ps1', '.psm1', '.psd1',
])
const TEXT_EXTS = new Set(['.txt', '.log', '.env', '.csv'])

/**
 * Determine how a file should be rendered in the preview.
 * Pass `name` (the bare filename, e.g. ".gitignore") in addition to `ext`
 * so that dotfiles whose path.extname() returns "" can still be rendered
 * as code rather than binary.
 */
export function getRenderType(ext: string, name?: string): RenderType {
  const e = ext.toLowerCase()
  if (MARKDOWN_EXTS.has(e)) return 'markdown'
  if (IMAGE_EXTS.has(e)) return 'image'
  if (CODE_EXTS.has(e)) return 'code'
  if (TEXT_EXTS.has(e)) return 'text'
  // Dotfiles with no extension: e.g. .gitignore, .bashrc, .zshrc, .bash, .zsh
  // path.extname('.gitignore') === '' so ext-based lookup always misses them.
  if (name && name.startsWith('.') && !name.slice(1).includes('.')) return 'code'
  return 'binary'
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function fileIcon(entry: { isDir: boolean; ext: string; name: string }): string {
  if (entry.isDir) return '📁'
  const e = entry.ext.toLowerCase()
  if (IMAGE_EXTS.has(e)) return '🖼️'
  if (MARKDOWN_EXTS.has(e)) return '📝'
  if (CODE_EXTS.has(e)) return '📄'
  // Dotfile with no extension
  if (entry.name.startsWith('.') && !entry.name.slice(1).includes('.')) return '📄'
  return '📃'
}
