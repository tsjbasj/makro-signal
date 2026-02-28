const https = require('https');

const SOURCES = {
  feargreed: {
    url: 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.cnn.com',
      'Referer': 'https://www.cnn.com/markets/fear-and-greed',
    }
  },
  spx: {
    url: 'https://stooq.com/q/d/l/?s=%5Espx&i=d',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/csv, text/plain, */*',
    }
  },
  pmi: {
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=NAPM',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/csv, text/plain, */*',
    }
  },
  treasury: {
    url: 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=60d',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    fallback: {
      url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv, */*' }
    }
  }
};

function fetchUrl(url, headers) {
  return new Promise((resolve, reject) => {
    const options = { headers, timeout: 12000 };
    const req = https.get(url, options, (res) => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data, contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = req.query && req.query.source;

  if (!source || !SOURCES[source]) {
    return res.status(400).json({
      error: 'Invalid source',
      valid: Object.keys(SOURCES)
    });
  }

  const config = SOURCES[source];

  try {
    const result = await fetchUrl(config.url, config.headers);

    if (result.status === 200) {
      const isJson = result.data.trim().startsWith('{') || result.data.trim().startsWith('[');
      res.setHeader('Content-Type', isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=1800, max-age=1800');
      return res.status(200).send(result.data);
    }

    // Non-200 — try fallback if available
    if (config.fallback) {
      const fb = await fetchUrl(config.fallback.url, config.fallback.headers);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Fallback', 'true');
      return res.status(200).send(fb.data);
    }

    return res.status(result.status).json({ error: `Upstream returned HTTP ${result.status}` });

  } catch (err) {
    // Network/timeout error — try fallback
    if (config.fallback) {
      try {
        const fb = await fetchUrl(config.fallback.url, config.fallback.headers);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Fallback', 'true');
        return res.status(200).send(fb.data);
      } catch (fbErr) {
        return res.status(502).json({ error: 'Primary and fallback both failed', details: fbErr.message });
      }
    }
    return res.status(502).json({ error: 'Fetch failed', details: err.message });
  }
};
