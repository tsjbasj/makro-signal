/**
 * api/data.js — Vercel serverless function
 *
 * Henter:
 *   • Fear & Greed Index via CNN (gratis, ingen nøgle)
 *   • S&P 500 pris + 52-ugers high via Yahoo Finance (gratis, ingen nøgle)
 *   • Sahm Rule (SAHMREALTIME) via FRED API
 *
 * Eneste env var: FRED_API_KEY
 *
 * Response: { fearGreedIndex, fearGreedLabel, sp500Price, sp500_52wHigh, sahmRule, updatedAt }
 */

const https = require('https');

/* ─── HTTP helper ───────────────────────────────────────────────────── */

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign(
      require('url').parse(url),
      {
        headers: Object.assign(
          {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          headers || {}
        ),
      }
    );
    https.get(opts, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      if (res.statusCode >= 400) {
        return reject(new Error('HTTP ' + res.statusCode + ' fra ' + url.slice(0, 60)));
      }
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse-fejl: ' + data.slice(0, 120))); }
      });
    }).on('error', reject);
  });
}

/* ─── Fear & Greed (CNN) ────────────────────────────────────────────── */

async function fetchFearGreed() {
  const json = await httpsGet(
    'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
    { Referer: 'https://edition.cnn.com/' }
  );

  const fg = json?.fear_and_greed;
  if (!fg) throw new Error('Uventet CNN F&G struktur');

  const score = Math.round(Number(fg.score));
  const raw   = (fg.rating || '').trim();

  // Normaliser label
  const label = (() => {
    const l = raw.toLowerCase();
    if (l.includes('extreme') && l.includes('fear')) return 'Extreme Fear';
    if (l.includes('extreme') && l.includes('greed')) return 'Extreme Greed';
    if (l.includes('fear'))   return 'Fear';
    if (l.includes('greed'))  return 'Greed';
    return 'Neutral';
  })();

  return { fearGreedIndex: score, fearGreedLabel: label };
}

/* ─── S&P 500 (Yahoo Finance) ───────────────────────────────────────── */

async function fetchSP500() {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC' +
    '?range=1y&interval=1d&includePrePost=false&events=div%7Csplit';

  const json = await httpsGet(url);

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Uventet Yahoo Finance struktur');

  const meta    = result.meta;
  const price   = Number(meta.regularMarketPrice  || meta.chartPreviousClose);
  const high52w = Number(meta.fiftyTwoWeekHigh);

  if (!price || !high52w) throw new Error('Mangler S&P 500 data fra Yahoo');

  return { sp500Price: Math.round(price), sp500_52wHigh: Math.round(high52w) };
}

/* ─── Sahm Rule (FRED) ──────────────────────────────────────────────── */

async function fetchSahm(apiKey) {
  const json = await httpsGet(
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=SAHMREALTIME&api_key=${apiKey}&limit=1&sort_order=desc&file_type=json`
  );
  const val = parseFloat(json?.observations?.[0]?.value);
  if (isNaN(val)) throw new Error('SAHMREALTIME returnerede ingen gyldig værdi');
  return val;
}

/* ─── Handler ───────────────────────────────────────────────────────── */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 1 time på CDN
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return res.status(500).json({ error: 'FRED_API_KEY mangler i Vercel env vars' });

  try {
    // Hent alle tre parallelt
    const [fg, sp, sahmRule] = await Promise.all([
      fetchFearGreed(),
      fetchSP500(),
      fetchSahm(fredKey),
    ]);

    return res.status(200).json({
      fearGreedIndex: fg.fearGreedIndex,
      fearGreedLabel: fg.fearGreedLabel,
      sp500Price:     sp.sp500Price,
      sp500_52wHigh:  sp.sp500_52wHigh,
      sahmRule,
      updatedAt:      new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/data]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
