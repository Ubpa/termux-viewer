import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { filesRoute } from './routes/files.js'
import { readRoute } from './routes/read.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT ?? 3001)

const app = Fastify({ logger: true })

// CORS for dev (Vite dev server on different port)
if (!isProd) {
  await app.register(cors, { origin: true })
}

// API routes
await app.register(filesRoute)
await app.register(readRoute)

// Production: serve Vite build (output is client/dist/ since vite root=client/)
if (isProd) {
  const distPath = path.join(__dirname, '../../client/dist')
  await app.register(staticPlugin, {
    root: distPath,
    prefix: '/',
  })
  // SPA fallback
  app.setNotFoundHandler((_req, reply) => {
    // @ts-ignore
    reply.sendFile('index.html')
  })
}

await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`termux-viewer running on http://0.0.0.0:${PORT}`)
