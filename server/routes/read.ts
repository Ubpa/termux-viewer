import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import mime from 'mime-types'
import { resolveSafePath, isSshPath, isImage, getExt, MAX_TEXT_BYTES, MAX_IMAGE_BYTES, HOME } from '../utils/fs.js'

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
      '.c', '.cpp', '.go', '.rs', '.java', '.rb', '.php',
      '.ini', '.conf', '.sql', '.dockerfile', '.makefile',
    ])

    if (TEXT_EXTS.has(ext) || mimeType.startsWith('text/') || isDotfile) {
      let content: string
      if (stat.size > MAX_TEXT_BYTES) {
        const buf = Buffer.alloc(MAX_TEXT_BYTES)
        const fh = await fs.open(absolutePath, 'r')
        await fh.read(buf, 0, MAX_TEXT_BYTES, 0)
        await fh.close()
        const lines = buf.toString('utf-8').split('\n').slice(0, 1000)
        content = lines.join('\n') + '\n\n[--- 文件过大，仅显示前 1000 行 ---]'
      } else {
        content = await fs.readFile(absolutePath, 'utf-8')
      }
      return reply.send({ type: 'text', content, mimeType })
    }

    // Binary / unknown
    return reply.send({ type: 'binary', content: '', mimeType })
  })
}
