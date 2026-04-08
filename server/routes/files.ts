import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { resolveSafePath, getExt, HOME } from '../utils/fs.js'

interface FileEntry {
  name: string
  path: string   // relative to HOME
  isDir: boolean
  size: number
  mtime: string
  ext: string
}

export async function filesRoute(app: FastifyInstance) {
  app.get('/api/files', async (request, reply) => {
    const { path: relPath = '/' } = request.query as { path?: string }

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(absolutePath, { withFileTypes: true })
    } catch {
      return reply.code(404).send({ error: 'Directory not found', code: 404 })
    }

    const result: FileEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const entryAbs = `${absolutePath}/${entry.name}`
        const relEntryPath = entryAbs.replace(HOME, '')
        let size = 0
        let mtime = new Date().toISOString()
        try {
          const stat = await fs.stat(entryAbs)
          size = entry.isDirectory() ? 0 : stat.size
          mtime = stat.mtime.toISOString()
        } catch {
          // ignore stat errors for inaccessible entries
        }
        return {
          name: entry.name,
          path: relEntryPath,
          isDir: entry.isDirectory(),
          size,
          mtime,
          ext: entry.isDirectory() ? '' : getExt(entry.name),
        }
      })
    )

    // Dirs first, then files; each group sorted alphabetically
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return reply.send(result)
  })
}
