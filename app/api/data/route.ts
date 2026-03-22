import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const revalidate = 3600

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const fredKey      = process.env.FRED_API_KEY ?? '61026cb5f11d98af5bc80a81e9860406'

  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY mangler' },
      { status: 500 }
    )
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for current market data and return ONLY valid JSON, no markdown, no explanation:
{"fearGreedIndex":<number 0-100>,"fearGreedLabel":"<Extreme Fear|Fear|Neutral|Greed|Extreme Greed>","sp500Price":<number>,"sp500_52wHigh":<number>,"sp500PeakDate":"<YYYY-MM-DD when SP500 last peaked before current decline>","ismPMI":<ISM Manufacturing PMI latest number>}
Search: 1) CNN Fear Greed Index 2) SP500 current price and 52-week high 3) SP500 recent peak date before current decline 4) ISM Manufacturing PMI latest. Return ONLY the JSON.`,
        }],
      })
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic HTTP ${anthropicRes.status}: ${err.slice(0, 200)}`)
    }

    const anthropicData = await anthropicRes.json()
    const text = (anthropicData.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Ingen JSON i svar: ${text.slice(0, 300)}`)
    const market = JSON.parse(match[0])

    const fredParts = ['https://api.stlouisfed.org/fred/series/observations', '?series_id=SAHMREALTIME', `&api_key=${fredKey}`, '&limit=1&sort_order=desc&file_type=json']
    const fredRes = await fetch(fredParts.join(''))
    const fredData = await fredRes.json()
    const sahmRule = parseFloat(fredData.observations?.[0]?.value)
    if (isNaN(sahmRule)) throw new Error('FRED SAHMREALTIME returnerede ingen gyldig vaerdi')

    return NextResponse.json(
      {
        fearGreedIndex: Number(market.fearGreedIndex),
        fearGreedLabel: String(market.fearGreedLabel),
        sp500Price:     Number(market.sp500Price),
        sp500_52wHigh:  Number(market.sp500_52wHigh),
        sp500PeakDate:  String(market.sp500PeakDate ?? ''),
        ismPMI:         Number(market.ismPMI ?? 50),
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
