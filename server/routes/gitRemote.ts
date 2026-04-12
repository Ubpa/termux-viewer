import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import { resolveSafePath, HOME } from '../utils/fs.js'

/** Parse the [remote "origin"] url from a .git/config string */
function parseOriginUrl(configText: string): string | null {
  // Find [remote "origin"] section, then grab first `url =` line
  const match = configText.match(/\[remote\s+"origin"\][^\[]*url\s*=\s*(.+)/s)
  if (!match) return null
  const raw = match[1].split('\n')[0].trim()
  return toHttpsUrl(raw)
}

/** Convert ssh/git remote URLs to browsable HTTPS URLs */
function toHttpsUrl(raw: string): string {
  // Already HTTPS/HTTP
  if (raw.startsWith('https://') || raw.startsWith('http://')) return raw
  // SSH: git@github.com:user/repo.git
  const sshMatch = raw.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`
  // git:// protocol
  const gitMatch = raw.match(/^git:\/\/([^/]+)\/(.+?)(?:\.git)?$/)
  if (gitMatch) return `https://${gitMatch[1]}/${gitMatch[2]}`
  return raw
}

/** Walk up from dir looking for .git/config, return its content or null */
async function findGitConfig(startDir: string, homeDir: string): Promise<string | null> {
  let dir = startDir
  while (true) {
    const candidate = path.join(dir, '.git', 'config')
    try {
      return await fs.readFile(candidate, 'utf-8')
    } catch {
      // not here, go up
    }
    const parent = path.dirname(dir)
    if (parent === dir || !dir.startsWith(homeDir)) break
    dir = parent
  }
  return null
}

export async function gitRemoteRoute(app: FastifyInstance) {
  app.get('/api/git-remote', async (request, reply) => {
    const { path: relPath } = request.query as { path?: string }
    if (!relPath) return reply.code(400).send({ error: 'path parameter required', code: 400 })

    let absolutePath: string
    try {
      absolutePath = await resolveSafePath(relPath)
    } catch (err: any) {
      return reply.code(err.statusCode ?? 500).send({ error: err.message, code: err.statusCode ?? 500 })
    }

    // Ensure it's a directory
    try {
      const stat = await fs.stat(absolutePath)
      if (!stat.isDirectory()) absolutePath = path.dirname(absolutePath)
    } catch {
      return reply.code(404).send({ error: 'path not found', code: 404 })
    }

    const configText = await findGitConfig(absolutePath, HOME)
    if (!configText) return reply.send({ url: null })

    const url = parseOriginUrl(configText)
    return reply.send({ url })
  })
}
