/**
 * Vercel Serverless Proxy — /api/fetch
 * Whitelists exactly 4 data sources for Makro Signal.
 */

const ALLOWED = [
  'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
  'https://stooq.com/q/d/l/',
  'https://fred.stlouisfed.org/graph/fredgraph.csv',
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

  try {
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MakroSignal/1.0)',
        Accept: '*/*',
      },
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
