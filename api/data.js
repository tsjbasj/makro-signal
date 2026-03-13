/**
 * api/data.js — Vercel serverless function
 *
 * Henter:
 *   • Fear & Greed Index + S&P 500 (pris + 52-ugers high) via Anthropic web_search
 *   • Sahm Rule (SAHMREALTIME) via FRED API
 *
 * Env vars: ANTHROPIC_API_KEY, FRED_API_KEY
 *
 * Response: { fearGreedIndex, fearGreedLabel, sp500Price, sp500_52wHigh, sahmRule, updatedAt }
 */

const https = require('https');

/* ─── HTTP helpers ──────────────────────────────────────────────────────── */

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body, 'utf8');
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': buf.length } },
      res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('JSON parse-fejl: ' + data.slice(0, 200))); }
        });
      }
    );
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('FRED JSON parse-fejl')); }
      });
    }).on('error', reject);
  });
}

/* ─── Anthropic web_search ──────────────────────────────────────────────── */

async function fetchMarketData(apiKey) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [
      {
        role: 'user',
        content:
          'Search for two things: (1) the current CNN Fear & Greed Index value and its label, ' +
          '(2) the current S&P 500 closing price and its 52-week high. ' +
          'Respond with ONLY a raw JSON object — no markdown, no code fences, no extra text. ' +
          'Use exactly these keys: ' +
          '"fearGreedIndex" (integer 0–100), ' +
          '"fearGreedLabel" (one of: "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"), ' +
          '"sp500Price" (number), ' +
          '"sp500_52wHigh" (number).',
      },
    ],
  });

  const result = await httpsPost(
    'api.anthropic.com',
    '/v1/messages',
    {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body
  );

  // Extract JSON from the last text block (model answers after tool use)
  const blocks = (result.content || []).slice().reverse();
  for (const block of blocks) {
    if (block.type !== 'text') continue;
    const m = block.text.match(/\{[\s\S]*\}/);
    if (!m) continue;
    try {
      const d = JSON.parse(m[0]);
      if (typeof d.fearGreedIndex === 'number' && typeof d.sp500Price === 'number') {
        return d;
      }
    } catch {}
  }
  throw new Error('Kunne ikke parse markedsdata fra Anthropic-svar');
}

/* ─── FRED ──────────────────────────────────────────────────────────────── */

async function fetchSahm(apiKey) {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=SAHMREALTIME&api_key=${apiKey}&limit=1&sort_order=desc&file_type=json`;
  const json = await httpsGet(url);
  const val = parseFloat(json?.observations?.[0]?.value);
  if (isNaN(val)) throw new Error('SAHMREALTIME returnerede ingen gyldig værdi');
  return val;
}

/* ─── Handler ───────────────────────────────────────────────────────────── */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 1 time på CDN; stale-while-revalidate 30 min
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const fredKey      = process.env.FRED_API_KEY;

  if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY mangler' });
  if (!fredKey)      return res.status(500).json({ error: 'FRED_API_KEY mangler' });

  try {
    // Hent markedsdata og Sahm parallelt
    const [market, sahmRule] = await Promise.all([
      fetchMarketData(anthropicKey),
      fetchSahm(fredKey),
    ]);

    return res.status(200).json({
      fearGreedIndex: Number(market.fearGreedIndex),
      fearGreedLabel: String(market.fearGreedLabel),
      sp500Price:     Number(market.sp500Price),
      sp500_52wHigh:  Number(market.sp500_52wHigh),
      sahmRule,
      updatedAt:      new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/data]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
