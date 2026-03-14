/**
 * api/data.js — Vercel serverless function
 * Ingen npm-pakker. Ingen env vars nødvendige. Alt hardcodet.
 *
 * Returnerer:
 * { fearGreedIndex, fearGreedLabel, sp500Price, sp500_52wHigh, sahmRule, updatedAt }
 */

const https = require('https');
const { parse } = require('url');

const FRED_KEY = '61026cb5f11d98af5bc80a81e9860406';

/* ── simpel HTTPS GET → JSON ─────────────────────────────── */
function get(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...parse(url),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        ...extraHeaders,
      },
    };
    const req = https.get(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('JSON-fejl: ' + body.slice(0, 80))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/* ── Fear & Greed (CNN) ──────────────────────────────────── */
async function fearGreed() {
  const j = await get(
    'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
    { Referer: 'https://edition.cnn.com/' }
  );
  const score = Math.round(Number(j?.fear_and_greed?.score));
  if (isNaN(score)) throw new Error('CNN F&G: uventet struktur');
  const r = (j.fear_and_greed.rating || '').toLowerCase();
  const label =
    r.includes('extreme') && r.includes('fear')  ? 'Extreme Fear'  :
    r.includes('extreme') && r.includes('greed') ? 'Extreme Greed' :
    r.includes('fear')  ? 'Fear'  :
    r.includes('greed') ? 'Greed' : 'Neutral';
  return { fearGreedIndex: score, fearGreedLabel: label };
}

/* ── S&P 500 via FRED (SP500 serie) ──────────────────────── */
async function sp500() {
  const j = await get(
    `https://api.stlouisfed.org/fred/series/observations?series_id=SP500&limit=260&sort_order=desc&file_type=json&api_key=${FRED_KEY}`
  );
  const vals = (j?.observations || [])
    .map(o => parseFloat(o.value))
    .filter(v => !isNaN(v));
  if (!vals.length) throw new Error('FRED SP500: ingen data');
  return {
    sp500Price:    Math.round(vals[0]),
    sp500_52wHigh: Math.round(Math.max(...vals)),
  };
}

/* ── Sahm Rule via FRED ───────────────────────────────────── */
async function sahm() {
  const j = await get(
    `https://api.stlouisfed.org/fred/series/observations?series_id=SAHMREALTIME&limit=1&sort_order=desc&file_type=json&api_key=${FRED_KEY}`
  );
  const v = parseFloat(j?.observations?.[0]?.value);
  if (isNaN(v)) throw new Error('FRED SAHM: ingen data');
  return v;
}

/* ── Handler ─────────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const [fgR, spR, sahmR] = await Promise.allSettled([fearGreed(), sp500(), sahm()]);

  const fg   = fgR.status   === 'fulfilled' ? fgR.value   : null;
  const sp   = spR.status   === 'fulfilled' ? spR.value   : null;
  const sahmV = sahmR.status === 'fulfilled' ? sahmR.value : null;

  // Log fejl til Vercel logs
  if (fgR.status   === 'rejected') console.error('[F&G]',  fgR.reason?.message);
  if (spR.status   === 'rejected') console.error('[SP500]', spR.reason?.message);
  if (sahmR.status === 'rejected') console.error('[SAHM]',  sahmR.reason?.message);

  if (!fg && !sp && sahmV === null) {
    const msgs = [fgR, spR, sahmR]
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message)
      .join(' | ');
    return res.status(500).json({ error: msgs });
  }

  return res.status(200).json({
    fearGreedIndex: fg?.fearGreedIndex ?? null,
    fearGreedLabel: fg?.fearGreedLabel ?? null,
    sp500Price:     sp?.sp500Price     ?? null,
    sp500_52wHigh:  sp?.sp500_52wHigh  ?? null,
    sahmRule:       sahmV,
    updatedAt:      new Date().toISOString(),
  });
};
