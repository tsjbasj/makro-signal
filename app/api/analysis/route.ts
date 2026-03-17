import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

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
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: 'Search for latest news and price action for OXY, PLTR, and CELC stocks today. For each stock give a signal (HOLD, BUY MORE, or SELL) and 2-3 sentence summary in Danish. Consider: recent news, momentum, distance from stop-loss and price target. Context: OXY bought at $54, target $68, stop $46. PLTR bought at $84, target $130, stop $72. CELC bought at $28, target $70 (+150%), stop $17 (-40%). Investment horizon: December 31 2026. Return ONLY valid JSON no markdown: {"analyses":[{"ticker":"OXY","signal":"HOLD","signalColor":"yellow","summary":"..."},{"ticker":"PLTR","signal":"HOLD","signalColor":"yellow","summary":"..."},{"ticker":"CELC","signal":"HOLD","signalColor":"yellow","summary":"..."}],"portfolioComment":"..."}',
        }],
      }),
    })
    if (!res.ok) throw new Error('Anthropic HTTP ' + res.status)
    const d = await res.json()
    const text = (d.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const m = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Ingen JSON: ' + text.slice(0, 200))
    return NextResponse.json(JSON.parse(m[0]))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/analysis]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
