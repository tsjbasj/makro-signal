/* Shared types, cache helpers and fetcher for /api/kurser.
   Both /regler and /investeringer read from the same sessionStorage key
   ("kurser_cache") so a refresh on one page is instantly visible on the
   other. TTL is 30 minutes. */

export interface KurserEntry {
  price: number
  ma200: number
  above: boolean
  currency: 'USD' | 'DKK'
  name: string
}

export const KURSER_CACHE_KEY = 'kurser_cache'
export const KURSER_CACHE_TTL_MS = 30 * 60 * 1000

export interface KurserCache {
  fetchedAt: number
  data: Record<string, KurserEntry>
}

export function readKurserCache(): KurserCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(KURSER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as KurserCache
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null
    if (Date.now() - (parsed.fetchedAt ?? 0) > KURSER_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function writeKurserCache(data: Record<string, KurserEntry>, fetchedAt: number) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      KURSER_CACHE_KEY,
      JSON.stringify({ fetchedAt, data }),
    )
  } catch {
    // quota / private mode — ignore
  }
}

/** Fetch live prices from /api/kurser and persist to sessionStorage.
 *  Returns null on network/parse failure. */
export async function fetchKurser(): Promise<KurserCache | null> {
  try {
    const res = await fetch('/api/kurser', { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json() as Record<string, KurserEntry>
    const fetchedAt = Date.now()
    const data = json && typeof json === 'object' ? json : {}
    writeKurserCache(data, fetchedAt)
    return { fetchedAt, data }
  } catch {
    return null
  }
}
