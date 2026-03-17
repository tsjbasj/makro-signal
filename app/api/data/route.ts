import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30          // Vercel Hobby max 30s
export const revalidate = 3600         // Cache response 1h on Vercel CDN

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const fredKey      = process.env.FRED_API_KEY ?? '61026cb5f11d98af5bc80a81e9860406'

  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY mangler â tilfÃ¸j den i Vercel â Settings â Environment Variables' },
      { status: 500 }
    )
  }

  try {
    // ââ 1. Markedsdata via Anthropic web_search ââââââââââââââââââ
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for current market data. Return ONLY valid JSON with no markdown, no explanation:
{"fearGreedIndex":<number 0-100>,"fearGreedLabel":"<Extreme Fear|Fear|Neutral|Greed|Extreme Greed>","sp500Price":<number>,"sp500_52wHigh":<number>}
Search: 1) CNN Fear Greed Index current value 2) S&P 500 current price and 52-week high. Return ONLY the JSON object.`,
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic HTTP ${anthropicRes.status}: ${err.slice(0, 200)}`)
    }

    const anthropicData = await anthropicRes.json()

    // Extract text blocks (model answers after tool use)
    const text = (anthropicData.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const match   = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Ingen JSON i Anthropic-svar: ${text.slice(0, 300)}`)

    const market = JSON.parse(match[0])

    // ââ 2. Sahm Rule via FRED ââââââââââââââââââââââââââââââââââââ
    const fredRes = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=SAHMREALTIME&api_key=${fredKey}&limit=1&sort_order=desc&file_type=json`
    )
    const fredData = await fredRes.json()
    const sahmRule = parseFloat(fredData.observations?.[0]?.value)

    if (isNaN(sahmRule)) throw new Error('FRED SAHMREALTIME returnerede ingen gyldig vÃ¦rdi')

    return NextResponse.json(
      {
        fearGreedIndex: Number(market.fearGreedIndex),
        fearGreedLabel: String(market.fearGreedLabel),
        sp500Price:     Number(market.sp500Price),
        sp500_52wHigh:  Number(market.sp500_52wHigh),
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
