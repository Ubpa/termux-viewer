export interface FileEntry {
  name: string
  path: string   // relative to HOME, e.g. "/projects/foo/bar.ts"
  isDir: boolean
  size: number
  mtime: string
  ext: string
}

export interface ReadResponse {
  type: 'text' | 'binary'
  content: string
  mimeType: string
  language?: string  // set by server for no-extension files with shebang
}

export interface ErrorResponse {
  error: string
  code: number
}

export type RenderType = 'markdown' | 'code' | 'image' | 'text' | 'binary' | 'unknown'
