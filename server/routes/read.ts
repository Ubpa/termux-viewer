import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import mime from 'mime-types'
import { resolveSafePath, isSshPath, isImage, getExt, MAX_TEXT_BYTES, MAX_IMAGE_BYTES, HOME } from '../utils/fs.js'

/**
 * Read a text file, truncating to 1000 lines if it exceeds MAX_TEXT_BYTES.
 */
async function readTextContent(absolutePath: string, size: number): Promise<string> {
  if (size > MAX_TEXT_BYTES) {
    const buf = Buffer.alloc(MAX_TEXT_BYTES)
    const fh = await fs.open(absolutePath, 'r')
    try {
      await fh.read(buf, 0, MAX_TEXT_BYTES, 0)
    } finally {
      await fh.close()
    }
    return buf.toString('utf-8').split('\n').slice(0, 1000).join('\n') + '\n\n[--- 文件过大，仅显示前 1000 行 ---]'
  }
  return fs.readFile(absolutePath, 'utf-8')
}

/**
 * Sniff the type of a no-extension, non-dotfile by examining its first 512 bytes.
 * Returns { isBinary: true } for binary files, or { isBinary: false, language? } for text.
 */
function sniffFileType(buf: Buffer): { isBinary: boolean; language?: string } {
  // Step 1: Magic bytes
  if (buf.length >= 4 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
    return { isBinary: true } // ELF
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { isBinary: true } // PNG
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { isBinary: true } // JPEG
  }
  if (buf.length >= 4 && buf.slice(0, 4).toString('ascii') === '%PDF') {
    return { isBinary: true } // PDF
  }
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return { isBinary: true } // ZIP/APK/JAR
  }
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return { isBinary: true } // gzip
  }

  // Step 2: Null byte sniffer — text files never contain \x00
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x00) return { isBinary: true }
  }

  // Step 3: Shebang detection
  const head = buf.toString('utf-8', 0, Math.min(buf.length, 200))
  if (head.startsWith('#!')) {
    const firstLine = head.split('\n')[0]
    if (/bash/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/zsh/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/sh/.test(firstLine)) return { isBinary: false, language: 'bash' }
    if (/python/.test(firstLine)) return { isBinary: false, language: 'python' }
    if (/node/.test(firstLine)) return { isBinary: false, language: 'javascript' }
    if (/ruby/.test(firstLine)) return { isBinary: false, language: 'ruby' }
    if (/perl/.test(firstLine)) return { isBinary: false, language: 'perl' }
    return { isBinary: false, language: 'plaintext' }
  }

  return { isBinary: false, language: 'plaintext' }
}

export async function readRoute(app: FastifyInstance) {
  app.get('/api/read', async (request, reply) => {
    const { path: relPath } = request.query as { path?: string }

    if (!relPath) {
      return reply.code(400).send({ error: 'path parameter required', code: 400 })
    }

    // Pre-check SSH path before symlink resolution (so non-existent .ssh/* files still 403)
    const earlyAbsPath = path.resolve(path.join(HOME, relPath))
    if (isSshPath(earlyAbsPath)) {
      return reply.code(403).send({ error: 'Access to .ssh directory is forbidden', code: 403 })
    }

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    let stat: import('fs').Stats
    try {
      stat = await fs.stat(absolutePath)
    } catch {
      return reply.code(404).send({ error: 'File not found', code: 404 })
    }

    if (stat.isDirectory()) {
      return reply.code(400).send({ error: 'Path is a directory', code: 400 })
    }

    const ext = getExt(absolutePath)
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream'

    // Images: stream binary directly
    if (isImage(ext)) {
      if (stat.size > MAX_IMAGE_BYTES) {
        return reply.code(413).send({ error: 'Image too large (max 10MB)', code: 413 })
      }
      reply.header('Content-Type', mimeType)
      reply.header('Content-Length', stat.size)
      return reply.send(createReadStream(absolutePath))
    }

    // Text files
    // Note: dotfiles (e.g. .bashrc, .profile, .gitignore) have path.extname() === ''
    // and mime-types returns false for them, so they fall back to application/octet-stream.
    // We treat no-extension dotfiles as text by default, since shell config files are text.
    const isDotfile = ext === '' && path.basename(absolutePath).startsWith('.')
    const TEXT_EXTS = new Set([
      '.md', '.markdown', '.txt', '.log', '.env',
      '.ts', '.tsx', '.js', '.jsx', '.py', '.sh', '.json',
      '.yaml', '.yml', '.toml', '.css', '.html', '.xml',
      '.c', '.cpp', '.h', '.hpp', '.hxx', '.inl', '.go', '.rs', '.java', '.rb', '.php',
      '.ini', '.conf', '.sql', '.dockerfile', '.makefile', '.ps1', '.psm1', '.psd1', '.cmake',
    ])

    if (TEXT_EXTS.has(ext) || mimeType.startsWith('text/') || isDotfile) {
      const content = await readTextContent(absolutePath, stat.size)
      return reply.send({ type: 'text', content, mimeType })
    }

    // No-extension, non-dotfile: sniff first 512 bytes
    if (ext === '' && !path.basename(absolutePath).startsWith('.')) {
      const sniffSize = Math.min(stat.size, 512)
      const sniffBuf = Buffer.alloc(sniffSize)
      const fh = await fs.open(absolutePath, 'r')
      try {
        await fh.read(sniffBuf, 0, sniffSize, 0)
      } finally {
        await fh.close()
      }

      const sniff = sniffFileType(sniffBuf)
      if (!sniff.isBinary) {
        const content = await readTextContent(absolutePath, stat.size)
        const response: { type: string; content: string; mimeType: string; language?: string } = {
          type: 'text', content, mimeType,
        }
        if (sniff.language) response.language = sniff.language
        return reply.send(response)
      }
    }

    // Binary / unknown
    return reply.send({ type: 'binary', content: '', mimeType })
  })
}
