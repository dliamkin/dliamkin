import type { SimulateRequestBody, SimulationResult } from '../types/oracle'
import { isSimulationResult } from '../types/oracle'

/**
 * localStorage forecast cache, keyed by SHA-256(serialized plan + targetModel).
 * A cache hit renders instantly and spends exactly zero tokens.
 */

const CACHE_KEY = 'dro:simCache:v1'
const MAX_ENTRIES = 40

interface CacheShape {
  [hash: string]: SimulationResult
}

function readCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: CacheShape = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (isSimulationResult(v)) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function writeCache(cache: CacheShape): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Quota exceeded / private mode — caching is best-effort.
  }
}

/**
 * Canonical serialization for hashing. Mirrors the server's compact
 * serialization: stripped empty fields, no pretty-printing.
 */
export function serializeForHash(body: SimulateRequestBody): string {
  if (body.freeform !== undefined) {
    return JSON.stringify({
      title: body.title,
      targetModel: body.targetModel,
      freeform: body.freeform,
      contextNotes: body.contextNotes,
    })
  }
  const steps = (body.steps ?? []).map((s) => {
    const out: Record<string, unknown> = { id: s.id, description: s.description }
    if (s.tools && s.tools.length > 0) out.tools = s.tools
    if (s.expectedIterations !== undefined) out.expectedIterations = s.expectedIterations
    return out
  })
  const out: Record<string, unknown> = { title: body.title, targetModel: body.targetModel, steps }
  if (body.contextNotes) out.contextNotes = body.contextNotes
  return JSON.stringify(out)
}

export async function hashPlan(body: SimulateRequestBody): Promise<string> {
  const text = `${serializeForHash(body)}|${body.targetModel}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function useSimCache() {
  function get(hash: string): SimulationResult | undefined {
    return readCache()[hash]
  }

  function set(hash: string, result: SimulationResult): void {
    const cache = readCache()
    cache[hash] = result
    const keys = Object.keys(cache)
    if (keys.length > MAX_ENTRIES) {
      // Evict oldest by createdAt.
      keys
        .sort((a, b) => (cache[a]?.createdAt ?? '').localeCompare(cache[b]?.createdAt ?? ''))
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((k) => delete cache[k])
    }
    writeCache(cache)
  }

  return { get, set, hashPlan }
}
