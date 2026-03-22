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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers') ?? 'NOVO-B,GN,UIE,NU,DLO,DEMANT,EQIX,CCJ,DSV,CRDO,ETN,IBN'
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY mangler' }, { status: 500 })
  }

  try {
    const tickerList = tickers.split(',').map((t: string) => t.trim())

    const prompt = `For each of these stock tickers: ${tickerList.join(', ')}, search for the current stock price and 200-day moving average (200-day SMA/MA).

Notes:
- NOVO-B = Novo Nordisk (Copenhagen Stock Exchange, NOVO-B.CO, prices in DKK)
- GN = GN Store Nord (Copenhagen, GN.CO, prices in DKK)
- UIE = search "UIE A/S Copenhagen stock price DKK" (Copenhagen, UIE.CO, prices in DKK)
- NU = Nu Holdings (NYSE: NU, prices in USD)
- DLO = dLocal (Nasdaq: DLO, prices in USD)
- DEMANT = Demant A/S (Copenhagen, DEMANT.CO, prices in DKK)
- EQIX = Equinix (Nasdaq: EQIX, prices in USD)
- CCJ = Cameco (NYSE: CCJ, prices in USD)
- DSV = DSV A/S (Copenhagen, DSV.CO, prices in DKK)
- CRDO = Credo Technology (Nasdaq: CRDO, prices in USD)
- ETN = Eaton Corporation (NYSE: ETN, prices in USD)
- IBN = ICICI Bank ADR (NYSE: IBN, prices in USD)

Return ONLY a valid JSON array with no extra text:
[
  {"ticker":"NOVO-B","name":"Novo Nordisk","currentPrice":232,"sma200":198,"above":true},
  {"ticker":"GN","name":"GN Store Nord","currentPrice":95,"sma200":108,"above":false}
]
Use numbers (not strings) for prices. Set "above" to true if currentPrice > sma200.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Ingen JSON array i svaret fra Anthropic')

    const result: Sma200Entry[] = JSON.parse(match[0])

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/sma200]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
