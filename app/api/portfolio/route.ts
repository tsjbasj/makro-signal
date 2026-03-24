import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY mangler' }, { status: 500 })
  const today = new Date().toISOString().split('T')[0]
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
          content: 'Search for the current stock price of OXY, PLTR, and CELC on ' + today + '.\nReturn ONLY valid JSON, no other text:\n{\n  \"stocks\": [\n    { \"ticker\": \"OXY\", \"price\": 57.9, \"change1d\": 0.5 },\n    { \"ticker\": \"PLTR\", \"price\": 151.4, \"change1d\": 1.2 },\n    { \"ticker\": \"CELC\", \"price\": 114.0, \"change1d\": -0.3 }\n  ],\n  \"lastUpdated\": \"' + today + '\"\n}'
        }]
      })
    })
    const data = await res.json()
    let raw = ''
    for (const block of (data.content ?? [])) {
      if (block.type === 'text') { raw = block.text; break }
    }
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Intet JSON i svar')
    return NextResponse.json(JSON.parse(m[0]))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ukendt fejl' }, { status: 500 })
  }
}
