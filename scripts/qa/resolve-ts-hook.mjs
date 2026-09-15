import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const HAS_EXT = /\.[a-z0-9]+$/i

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !HAS_EXT.test(specifier) && context.parentURL) {
    const base = new URL(specifier, context.parentURL).href
    for (const ext of ['.ts', '.tsx', '.mts']) {
      if (existsSync(fileURLToPath(base + ext))) return nextResolve(base + ext, context)
    }
  }
  return nextResolve(specifier, context)
}
