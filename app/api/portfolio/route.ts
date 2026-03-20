import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY mangler' }, { status: 500 })
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: 'Search for the current stock price and today percentage change for OXY (Occidental Petroleum), PLTR (Palantir Technologies), and CELC (Celcuity) stocks (prices in USD). Also find the current price of UIE (United International Enterprises, Copenhagen Stock Exchange, ticker UIE) in DKK. Also find the current USD to DKK exchange rate. Return ONLY valid JSON with no markdown or explanation: {"stocks":[{"ticker":"OXY","price":54.0,"change1d":0.5},{"ticker":"PLTR","price":84.0,"change1d":1.2},{"ticker":"CELC","price":28.0,"change1d":-0.3},{"ticker":"UIE","price":369.0,"change1d":0.0}],"usdDkk":6.90,"lastUpdated":"2026-03-20"}',
        }],
      }),
    })
    if (!res.ok) { const errBody = await res.text(); throw new Error('Anthropic HTTP ' + res.status + ': ' + errBody) }
    const d = await res.json()
    const text = (d.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const m = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Ingen JSON i svar: ' + text.slice(0, 200))
    return NextResponse.json(JSON.parse(m[0]), { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/portfolio]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
