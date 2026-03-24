import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY mangler' }, { status: 500 })
  const today = new Date().toISOString().split('T')[0]
  const prompt = `Du er en aggressiv portef\u00f8ljemanager. Analyser f\u00f8lgende tre aktier i en dansk investors h\u00f8j-risiko portef\u00f8lje med slutdato 31. december 2026.

PORTEF\u00d8LJE:
- OXY (Occidental Petroleum): K\u00f8bt $57,90 \u00b7 Stop-loss s\u00e6lg $35 \u00b7 Kursm\u00e5l s\u00e6lg $75 \u00b7 Tema: energi/Iran
- PLTR (Palantir): K\u00f8bt $151,40 \u00b7 Stop-loss s\u00e6lg $91 \u00b7 Kursm\u00e5l s\u00e6lg $230 \u00b7 Tema: AI/forsvar
- CELC (Celcuity): K\u00f8bt $114,00 \u00b7 Stop-loss s\u00e6lg $68 \u00b7 Kursm\u00e5l s\u00e6lg $220 \u00b7 Tema: biotech/FDA 17. juli 2026

Brug web search til at finde:
1. Seneste nyheder og kursudvikling for hver aktie
2. Om der er sket noget der \u00e6ndrer thesen
3. Om aktien stadig er den bedste eksponering mod sit tema frem til 31. dec

For hver aktie: giv signal (HOLD / K\u00d8B MERE / S\u00c6LG), en begrundelse p\u00e5 2-3 s\u00e6tninger p\u00e5 dansk, og hvis signalet er S\u00c6LG \u2014 foresl\u00e5 \u00e9n konkret erstatningsaktie med ticker og begrundelse.

Svar KUN med valid JSON:
{
  "analyser": [
    {
      "ticker": "OXY",
      "signal": "HOLD",
      "begrundelse": "2-3 s\u00e6tninger p\u00e5 dansk",
      "erstatning": null
    }
  ],
  "portef\u00f8ljeKommentar": "1-2 s\u00e6tninger om samlet portef\u00f8lje p\u00e5 dansk",
  "analyseDato": "${today}"
}`
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
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
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
