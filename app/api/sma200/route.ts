import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export interface Sma200Entry {
  ticker: string
  name: string
  currentPrice: number
  sma200: number
  above: boolean
}

const TICKER_MAP: Record<string, { yahoo: string; name: string }> = {
  'NOVO-B':  { yahoo: 'NOVO-B.CO', name: 'Novo Nordisk' },
  'GN':      { yahoo: 'GN.CO',     name: 'GN Store Nord' },
  'UIE':     { yahoo: 'UIE.CO',    name: 'UIE A/S' },
  'NU':      { yahoo: 'NU',        name: 'NU Holdings' },
  'DLO':     { yahoo: 'DLO',       name: 'dLocal' },
  'DEMANT':  { yahoo: 'DEMANT.CO', name: 'Demant A/S' },
  'EQIX':    { yahoo: 'EQIX',      name: 'Equinix' },
  'CCJ':     { yahoo: 'CCJ',       name: 'Cameco' },
  'DSV':     { yahoo: 'DSV.CO',    name: 'DSV A/S' },
  'CRDO':    { yahoo: 'CRDO',      name: 'Credo Technology' },
  'ETN':     { yahoo: 'ETN',       name: 'Eaton Corporation' },
  'IBN':     { yahoo: 'IBN',       name: 'ICICI Bank ADR' },
}

async function fetchSma200(ticker: string): Promise<Sma200Entry | null> {
  const info = TICKER_MAP[ticker]
  if (!info) return null
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(info.yahoo)}?interval=1d&range=1y`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
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
    const sma200 = Math.round(window200.reduce((a: number, b: number) => a + b, 0) / window200.length * 100) / 100
    const cp = Math.round(currentPrice * 100) / 100
    return { ticker, name: info.name, currentPrice: cp, sma200, above: cp > sma200 }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers') ?? 'NOVO-B,GN,UIE,NU,DLO,DEMANT,EQIX,CCJ,DSV,CRDO,ETN,IBN'
  const tickerList = tickers.split(',').map((t: string) => t.trim())
  try {
    const results = await Promise.all(tickerList.map(fetchSma200))
    const valid = results.filter((r): r is Sma200Entry => r !== null)
    return NextResponse.json(valid)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
