import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { ticker } = await req.json()
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

    const prompt = `Du er en erfaren finansanalytiker. Analysér aktien ${ticker} og giv en struktureret analyse.

Søg efter aktuel information om ${ticker} inkl. aktuel kurs, 52-ugers højde/law, P/E-tal, EPS, og de seneste nyheder.

Returner KUN et JSON-objekt (ingen markdown, ingen kommentarer) med denne præcise struktur:
{
  "name": "fuldt selskabsnavn",
  "currentPrice": 123.45,
  "stopLoss": 110.00,
  "exitTarget": 160.00,
  "dom": "KØB" | "AFVENT" | "SKIP",
  "horizon": "kort" | "mellem" | "lang",
  "horizonText": "f.eks. < 1 år" | "1-3 år" | "3+ år",
  "reason": "2-3 sætninger om hvorfor denne vurdering på dansk"
}

Regler for dom:
- KØB: Stærk momentum, god value, positive katalysatorer
- AFVENT: Usikker retning, afvent bekræftelse
- SKIP: Svag fundamental, negativ trend, høj risiko

Regler for horizon:
- kort: < 1 år (#f59e0b)
- mellem: 1-3 år (#6366f1)
- lang: 3+ år (#22c55e)

Svar KUN med JSON.`

    const response = await client.messages.create({
      model: 'claude-haiku-3-5-20241022',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as never],
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract text content from response
    let jsonText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonText = block.text.trim()
        break
      }
    }

    // Strip markdown code fences if present
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const data = JSON.parse(jsonText)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[radar-analyse]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
