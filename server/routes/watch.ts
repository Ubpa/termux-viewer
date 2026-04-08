import type { FastifyInstance } from 'fastify'
import fs from 'fs'
import { resolveSafePath } from '../utils/fs.js'

export async function watchRoute(app: FastifyInstance) {
  app.get('/api/watch', async (request, reply) => {
    const { path: relPath } = request.query as { path?: string }

    if (!relPath) {
      return reply.code(400).send({ error: 'path parameter required', code: 400 })
    }

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    // Must be a directory
    try {
      const stat = await fs.promises.stat(absolutePath)
      if (!stat.isDirectory()) {
        return reply.code(400).send({ error: 'Path is not a directory', code: 400 })
      }
    } catch {
      return reply.code(404).send({ error: 'Directory not found', code: 404 })
    }

    // Set SSE headers and take control of the raw response
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if behind proxy
    })
    reply.raw.write('data: connected\n\n')

    // Debounce rapid fs.watch events (e.g. editor saves trigger multiple events)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const sendChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!reply.raw.writableEnded) {
          reply.raw.write('data: change\n\n')
        }
      }, 300)
    }

    let watcher: fs.FSWatcher | null = null
    try {
      watcher = fs.watch(absolutePath, { persistent: false }, sendChange)
    } catch {
      // If watch fails (e.g. inotify limit), just close gracefully
      reply.raw.end()
      return reply.hijack()
    }

    const cleanup = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher?.close()
      watcher = null
    }

    request.raw.socket?.on('close', cleanup)

    return reply.hijack()
  })
}
