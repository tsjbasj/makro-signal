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
        max_tokens: 512,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: 'Search for the current stock prices in DKK for these Copenhagen Stock Exchange stocks: GN (GN Store Nord), NOVO-B (Novo Nordisk B), and UIE (United International Enterprises). Return ONLY valid JSON with no markdown: {"stocks":[{"ticker":"GN","price":94.72,"change1d":3.07},{"ticker":"NOVO-B","price":231.95,"change1d":-2.50},{"ticker":"UIE","price":367.50,"change1d":-1.21}],"lastUpdated":"2026-03-20"}',
        }],
      }),
    })
    if (!res.ok) { const errBody = await res.text(); throw new Error('Anthropic HTTP ' + res.status + ': ' + errBody) }
    const d = await res.json()
    const text = (d.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    const m = text.replace(/```json|```/g, '').trim().match(/{[\s\S]*}/)
    if (!m) throw new Error('Ingen JSON i svar: ' + text.slice(0, 200))
    return NextResponse.json(JSON.parse(m[0]), { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[/api/portefolje-kurser]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}