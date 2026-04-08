import path from 'path'
import fs from 'fs/promises'

export const HOME = process.env.HOME ?? '/data/data/com.termux/files/home'

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'])

const SSH_DIR = path.join(HOME, '.ssh')

const MAX_TEXT_BYTES = 1024 * 1024       // 1 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Resolve a client-supplied relative path to an absolute path,
 * checking it stays within HOME and isn't a symlink escape.
 * Throws with statusCode 403 if the path is unsafe.
 */
export async function resolveSafePath(relPath: string): Promise<string> {
  // Treat relPath as relative to HOME
  const joined = path.join(HOME, relPath)
  const resolved = path.resolve(joined)

  // First prefix check (fast, before hitting disk)
  if (!resolved.startsWith(HOME + path.sep) && resolved !== HOME) {
    const err = new Error('Forbidden') as NodeJS.ErrnoException
    ;(err as any).statusCode = 403
    throw err
  }

  // Resolve symlinks to real path
  let real: string
  try {
    real = await fs.realpath(resolved)
  } catch (e: any) {
    const isNotFound = e.code === 'ENOENT'
    const err = new Error(isNotFound ? 'Not found' : 'Forbidden') as any
    err.statusCode = isNotFound ? 404 : 403
    throw err
  }

  if (!real.startsWith(HOME + path.sep) && real !== HOME) {
    const err = new Error('Forbidden') as any
    err.statusCode = 403
    throw err
  }

  return real
}

/**
 * Returns true if the path is inside ~/.ssh (content reading blocked).
 */
export function isSshPath(absolutePath: string): boolean {
  return absolutePath.startsWith(SSH_DIR + path.sep) || absolutePath === SSH_DIR
}

/**
 * Returns the lowercase extension including the dot, e.g. ".ts".
 * Returns "" for no extension or directories.
 */
export function getExt(name: string): string {
  return path.extname(name).toLowerCase()
}

export function isImage(ext: string): boolean {
  return IMAGE_EXTS.has(ext)
}

export { MAX_TEXT_BYTES, MAX_IMAGE_BYTES }
