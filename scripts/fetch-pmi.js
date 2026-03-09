/**
 * fetch-pmi.js
 * Henter ISM Manufacturing PMI fra FRED (serie: NAPM) og skriver data/pmi.json.
 *
 * Kørsel: node scripts/fetch-pmi.js
 *
 * Bemærk: FRED fjernede NAPM-serien i 2023 pga. ISM's copyright.
 * Hvis fetch fejler med HTTP 404, er serien stadig fjernet og scriptet
 * afslutter med exitcode 1 — GitHub Action-loggen vil vise årsagen tydeligt.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const FRED_CSV = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=NAPM';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'makro-signal/1.0' } }, res => {
      // Følg redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location));
      }
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} fra ${url}`));
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Henter ISM PMI fra FRED (NAPM)…');
  const csv = await get(FRED_CSV);

  const rows = csv
    .trim()
    .split('\n')
    .filter(r => r && !r.startsWith('DATE') && !r.includes('ND'))
    .map(r => {
      const [date, val] = r.split(',');
      return { date: date.trim(), value: parseFloat(val.trim()) };
    })
    .filter(r => !isNaN(r.value));

  if (rows.length === 0) {
    throw new Error('FRED returnerede ingen gyldige rækker — serien kan være fjernet');
  }

  // Seneste 13 måneder til historik
  const history = rows.slice(-13);
  const latest  = history[history.length - 1];

  const output = {
    series:     'US ISM Manufacturing PMI',
    source:     'FRED/NAPM',
    updated_at: new Date().toISOString().split('T')[0],
    latest,
    history
  };

  const outPath = path.join(__dirname, '..', 'data', 'pmi.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✅ Skrevet til data/pmi.json  →  ${latest.date}: ${latest.value}`);
}

main().catch(err => {
  console.error('❌ fetch-pmi.js fejlede:', err.message);
  process.exit(1);
});
