import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export interface KurserEntry {
  price: number
  ma200: number
  above: boolean
  currency: 'USD' | 'DKK'
  name: string
}

const TICKER_INFO: Record<string, { yahoo: string; name: string; currency: 'USD' | 'DKK' }> = {
  // USD
  PLTR:     { yahoo: 'PLTR',      name: 'Palantir',      currency: 'USD' },
  CELC:     { yahoo: 'CELC',      name: 'Celcuity',      currency: 'USD' },
  CRWD:     { yahoo: 'CRWD',      name: 'CrowdStrike',   currency: 'USD' },
  ETN:      { yahoo: 'ETN',       name: 'Eaton',         currency: 'USD' },
  DLO:      { yahoo: 'DLO',       name: 'dLocal',        currency: 'USD' },
  // Copenhagen DKK
  'NOVO-B': { yahoo: 'NOVO-B.CO', name: 'Novo Nordisk',  currency: 'DKK' },
  UIE:      { yahoo: 'UIE.CO',    name: 'UIE A/S',       currency: 'DKK' },
  GN:       { yahoo: 'GN.CO',     name: 'GN Store Nord', currency: 'DKK' },
}

async function fetchOne(local: string): Promise<KurserEntry | null> {
  const info = TICKER_INFO[local]
  if (!info) return null
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(info.yahoo)}?interval=1d&range=1y`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
      // Avoid Vercel edge caching old prices
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
    const valid = closes.filter((c): c is number => c !== null && !isNaN(c))
    if (valid.length < 50) return null
    const currentPrice: number = result.meta?.regularMarketPrice ?? valid[valid.length - 1]
    const window200 = valid.slice(-200)
    const ma200 = Math.round(
      (window200.reduce((a, b) => a + b, 0) / window200.length) * 100
    ) / 100
    const price = Math.round(currentPrice * 100) / 100
    return {
      price,
      ma200,
      above: price > ma200,
      currency: info.currency,
      name: info.name,
    }
  } catch {
    return null
  }
}

export async function GET() {
  const tickers = Object.keys(TICKER_INFO)
  const results = await Promise.all(
    tickers.map(async (t) => [t, await fetchOne(t)] as const)
  )
  const out: Record<string, KurserEntry> = {}
  for (const [t, r] of results) {
    if (r) out[t] = r
  }
  return NextResponse.json(out)
}
