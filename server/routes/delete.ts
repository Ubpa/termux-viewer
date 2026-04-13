import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import { resolveSafePath, isSshPath, HOME } from '../utils/fs.js'

export async function deleteRoute(app: FastifyInstance) {
  app.delete('/api/delete', async (request, reply) => {
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

    // Block deletion of HOME itself
    if (absolutePath === HOME) {
      return reply.code(403).send({ error: 'Cannot delete home directory', code: 403 })
    }

    // Block deletion inside .ssh
    if (isSshPath(absolutePath)) {
      return reply.code(403).send({ error: 'Cannot delete .ssh contents', code: 403 })
    }

    try {
      const stat = await fs.stat(absolutePath)

      if (stat.isDirectory()) {
        await fs.rm(absolutePath, { recursive: true, force: true })
      } else {
        await fs.unlink(absolutePath)
      }

      return reply.send({ success: true })
    } catch (err: any) {
      return reply.code(500).send({ error: err.message || 'Failed to delete', code: 500 })
    }
  })
}
