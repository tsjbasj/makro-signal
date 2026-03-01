/**
 * Vercel Serverless Proxy — /api/fetch
 * Whitelists exactly 4 data sources for Makro Signal.
 */

const ALLOWED = [
  'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
  'https://stooq.com/q/d/l/',
  'https://fred.stlouisfed.org/graph/fredgraph.csv',
  'https://fred.stlouisfed.org/data/',
  'https://query1.finance.yahoo.com/v8/finance/chart/',
];

function isAllowed(url) {
  return ALLOWED.some(prefix => url.startsWith(prefix));
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid url encoding' });
  }

  if (!isAllowed(decoded)) {
    return res.status(403).json({
      error: 'URL not in whitelist',
      url: decoded,
    });
  }

  // Build request headers — add Referer for FRED to avoid 404
  const upstreamHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  if (decoded.includes('fred.stlouisfed.org')) {
    upstreamHeaders['Referer'] = 'https://fred.stlouisfed.org/';
  }

  try {
    const upstream = await fetch(decoded, {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(upstream.status).send(Buffer.from(body));
  } catch (err) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: err.message });
  }
};
