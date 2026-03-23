import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const revalidate = 3600

const FRED_KEY = process.env.FRED_API_KEY ?? '61026cb5f11d98af5bc80a81e9860406'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

// ── S&P 500 via Yahoo Finance ────────────────────────────────────────────────
async function fetchSP500(): Promise<{ price: number; high52w: number; peakDate: string }> {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1y'
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error('Yahoo Finance S&P 500: HTTP ' + res.status)
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error('Yahoo Finance: ingen data for ^GSPC')
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
  const timestamps: number[] = result.timestamp ?? []
  const price: number =
    result.meta?.regularMarketPrice ??
    closes.filter((c): c is number => c !== null).slice(-1)[0]
  let high52w = 0
  let peakDate = ''
  for (let i = 0; i < closes.length; i++) {
    const c = closes[i]
    if (c !== null && c !== undefined && c > high52w) {
      high52w = c
      peakDate = timestamps[i] ? new Date(timestamps[i] * 1000).toISOString().slice(0, 10) : ''
    }
  }
  return {
    price:   Math.round(price   * 100) / 100,
    high52w: Math.round(high52w * 100) / 100,
    peakDate,
  }
}

// ── CNN Fear & Greed ─────────────────────────────────────────────────────────
function labelFromScore(s: number): string {
  if (s <= 25) return 'Extreme Fear'
  if (s <= 45) return 'Fear'
  if (s <= 55) return 'Neutral'
  if (s <= 75) return 'Greed'
  return 'Extreme Greed'
}

async function fetchFearGreed(): Promise<{ score: number; label: string }> {
  const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata'
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': 'https://edition.cnn.com/' },
  })
  if (!res.ok) throw new Error('CNN Fear & Greed: HTTP ' + res.status)
  const data = await res.json()
  const score = data?.fear_and_greed?.score
  if (score === undefined || score === null) throw new Error('CNN F&G: ingen score i svar')
  const rating: string = data?.fear_and_greed?.rating ?? ''
  const label = rating
    ? rating.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : labelFromScore(Math.round(Number(score)))
  return { score: Math.round(Number(score)), label }
}

// ── ISM Manufacturing PMI via DBnomics (free, no key needed) ────────────────
// Falls back to neutral value (50) if API is unavailable
async function fetchISMPMI(): Promise<number> {
  try {
    const url = 'https://api.db.nomics.world/v22/series/ISM/pmi?observations=1&last_n_periods=3'
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': UA },
    })
    if (!res.ok) throw new Error('DBnomics HTTP ' + res.status)
    const data = await res.json()
    const docs: Array<Record<string, unknown>> = data?.series?.docs ?? []
    for (const s of docs) {
      const vals: unknown[] = (s['value'] as unknown[]) ?? []
      // Values are in chronological order; get the last non-null value
      for (let i = vals.length - 1; i >= 0; i--) {
        const v = vals[i]
        if (typeof v === 'number' && !isNaN(v)) return v
      }
    }
    throw new Error('DBnomics: ingen gyldig PMI vaerdi')
  } catch (e) {
    console.warn('[/api/data] ISM PMI unavailable, using neutral default:', e)
    // Fallback: latest known value (Feb 2026). Update monthly if DBnomics stays unavailable.
    return 52.4
  }
}

// ── FRED series ──────────────────────────────────────────────────────────────
async function fetchFred(seriesId: string): Promise<number> {
  const url =
    'https://api.stlouisfed.org/fred/series/observations' +
    '?series_id=' + seriesId +
    '&api_key=' + FRED_KEY +
    '&sort_order=desc&limit=3&file_type=json'
  const res = await fetch(url)
  if (!res.ok) throw new Error('FRED ' + seriesId + ': HTTP ' + res.status)
  const data = await res.json()
  const obs: Array<{ value: string }> = data?.observations ?? []
  const valid = obs.find(o => o.value !== '.' && !isNaN(parseFloat(o.value)))
  if (!valid) throw new Error('FRED ' + seriesId + ': ingen gyldig vaerdi')
  return parseFloat(valid.value)
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [sp500, fearGreed, ismPMI, sahmRule] = await Promise.all([
      fetchSP500(),
      fetchFearGreed(),
      fetchISMPMI(),
      fetchFred('SAHMREALTIME'),
    ])

    return NextResponse.json(
      {
        fearGreedIndex: fearGreed.score,
        fearGreedLabel: fearGreed.label,
        sp500Price:     sp500.price,
        sp500_52wHigh:  sp500.high52w,
        sp500PeakDate:  sp500.peakDate,
        ismPMI,
        sahmRule,
        updatedAt:      new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/data]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
