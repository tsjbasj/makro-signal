import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickersParam = searchParams.get('tickers') ?? ''
  const tickers = tickersParam.split(',').map((t: string) => t.trim()).filter(Boolean)
  const result: Record<string, number | null> = {}
  await Promise.all(tickers.map(async (ticker: string) => {
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?interval=1d&range=1d'
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        signal: AbortSignal.timeout(8000),
      })
      const data = await res.json()
      result[ticker] = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
    } catch {
      result[ticker] = null
    }
  }))
  return NextResponse.json(result)
}
