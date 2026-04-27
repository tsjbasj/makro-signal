'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Position {
  ticker: string
  name: string
  quantity: number
  gak: number
  lastPrice: number
  currency: string
  marketValueDkk: number
  returnPct: number
  returnDkk: number
  kontonummer?: string
}

type SectionId = 'run2026' | 'enkeltaktier' | 'etf' | 'krypto' | 'ask'

/* ─── Danish number parsing ─────────────────────────────────────────── */
// Danish format: 1.234.567,89 (period = thousands, comma = decimal)
function parseDanishNumber(raw: string | undefined | null): number {
  if (raw == null) return 0
  let s = String(raw).trim()
  if (!s) return 0
  s = s.replace(/\s/g, '').replace(/%/g, '')
  s = s.replace(/[A-Za-z]+$/g, '').replace(/^[A-Za-z]+/g, '')
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')
    const allGroupsOf3 = parts.length > 1 && parts.slice(1).every(p => p.length === 3)
    if (allGroupsOf3) s = parts.join('')
  }
  const n = parseFloat(s)
  if (isNaN(n)) return 0
  return negative ? -n : n
}

/* ─── CSV parsing (Nordnet DK semicolon-separated) ──────────────────── */
function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const firstLine = cleaned.split(/\r?\n/)[0] ?? ''
  const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let cur: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === sep) {
        cur.push(cell); cell = ''
      } else if (c === '\n') {
        cur.push(cell); cell = ''
        rows.push(cur); cur = []
      } else if (c === '\r') {
        // skip
      } else {
        cell += c
      }
    }
  }
  if (cell.length > 0 || cur.length > 0) { cur.push(cell); rows.push(cur) }
  return rows.filter(r => r.some(v => v.trim() !== ''))
}

/* ─── Column auto-detection ─────────────────────────────────────────── */
const COL_PATTERNS: Record<string, RegExp[]> = {
  name:      [/^v(æ|ae)rdipapir/i, /^navn/i, /^instrument/i, /^titel/i, /^beskrivelse/i],
  ticker:    [/ticker/i, /symbol/i, /isin/i, /^kode/i],
  quantity:  [/^antal$/i, /^st(k|ykker)/i, /^beholdning/i, /^volumen/i, /^andele/i],
  gak:       [/^gak/i, /gns.*kurs/i, /gennemsnit.*kurs/i, /gennemsnit.*pris/i, /average.*price/i, /k(ø|oe)bskurs/i, /anskaffelse/i],
  lastPrice: [/^kurs$/i, /seneste.*kurs/i, /^aktuel.*kurs/i, /sidste.*kurs/i, /markedskurs/i, /last.*price/i, /^pris$/i],
  currency:  [/^valuta$/i, /currency/i, /^vlt$/i],
  marketValueDkk: [/markedsv(æ|ae)rdi.*dkk/i, /v(æ|ae)rdi.*dkk/i, /kursv(æ|ae)rdi.*dkk/i, /^markedsv(æ|ae)rdi$/i, /^kursv(æ|ae)rdi$/i, /^v(æ|ae)rdi$/i, /total.*dkk/i],
  returnPct: [/afkast.*%/i, /afkast.*pct/i, /^%$/, /^afkast pct/i, /urealiseret.*%/i, /return.*%/i],
  returnDkk: [/afkast.*dkk/i, /^afkast$/i, /urealiseret.*dkk/i, /urealiseret afkast/i, /^afkast kr/i, /return.*dkk/i, /resultat/i],
}

function findColumnIndices(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  for (const key of Object.keys(COL_PATTERNS)) {
    idx[key] = -1
    for (let i = 0; i < header.length; i++) {
      const h = header[i].trim()
      if (COL_PATTERNS[key].some(re => re.test(h))) {
        idx[key] = i
        break
      }
    }
  }
  return idx
}

/* ─── Section guessing ──────────────────────────────────────────────── */
const RUN_2026_TICKERS = ['OXY', 'PLTR', 'CELC', 'CELCG']
const CRYPTO_HINTS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'BITCOIN', 'ETHEREUM', 'CRYPTO', 'KRYPTO', 'NBT', 'XBT', 'COINSHARES']
const ETF_HINTS = ['ETF', 'IWDA', 'EUNL', 'VWCE', 'VUSA', 'CSPX', 'EIMI', 'INDEX', 'MSCI', 'SPDR', 'ISHARES', 'VANGUARD', 'XTRACKERS', 'AMUNDI', 'INVESCO']
const ASK_HINTS = ['ASK', 'ALDERSOPSPARING', 'PENSION', 'RATEPENSION']

/* Extract Nordnet account number from filename, e.g.
   "Aktietabel, Nordnet kontonummer 61788469, 27.4.2026.csv" -> "61788469" */
function extractKontonummer(filename: string): string | null {
  const m = filename.match(/kontonummer[\s_-]*(\d[\d-]*)/i)
  return m ? m[1] : null
}

function guessSection(filename: string, positions: Position[]): SectionId {
  const fn = filename.toUpperCase()
  // Most specific filename keywords win — but NEVER match on year alone (Nordnet
  // includes 2026 in nearly every default export filename).
  if (ASK_HINTS.some(h => fn.includes(h))) return 'ask'
  if (CRYPTO_HINTS.some(h => fn.includes(h))) return 'krypto'
  if (ETF_HINTS.some(h => fn.includes(h))) return 'etf'
  // Only call it the Run if the filename explicitly says "RUN" or includes
  // at least 2 of the run tickers as whole tokens — not arbitrary substrings.
  const runTickerWordHits = RUN_2026_TICKERS.filter(t =>
    new RegExp(`(^|[^A-Z])${t}([^A-Z]|$)`).test(fn)
  ).length
  if (runTickerWordHits >= 2 || /\bRUN\b/.test(fn)) return 'run2026'

  // Ticker-based scoring (only counts if positions actually have these tickers).
  if (positions.length === 0) return 'enkeltaktier'
  let scoreRun = 0, scoreCrypto = 0, scoreEtf = 0
  for (const p of positions) {
    const t = (p.ticker || '').toUpperCase()
    const n = (p.name || '').toUpperCase()
    if (RUN_2026_TICKERS.includes(t)) scoreRun++
    if (CRYPTO_HINTS.some(h => t === h || n.includes(h))) scoreCrypto++
    if (ETF_HINTS.some(h => t.includes(h) || n.includes(h))) scoreEtf++
  }

  // Run only wins if the file is small and ALL positions are run-tickers.
  if (positions.length <= 4 && scoreRun === positions.length && scoreRun > 0) return 'run2026'
  // Otherwise pick majority-sector by proportion (≥50%).
  const half = positions.length / 2
  if (scoreCrypto >= half && scoreCrypto >= scoreEtf) return 'krypto'
  if (scoreEtf >= half) return 'etf'

  return 'enkeltaktier'
}

/* ─── Row -> Position ───────────────────────────────────────────────── */
function rowsToPositions(header: string[], rows: string[][]): Position[] {
  const idx = findColumnIndices(header)
  const out: Position[] = []
  for (const r of rows) {
    const get = (key: string) => idx[key] >= 0 ? (r[idx[key]] ?? '') : ''
    const ticker = (get('ticker') || '').trim()
    const name = (get('name') || '').trim()
    if (!ticker && !name) continue
    const quantity = parseDanishNumber(get('quantity'))
    if (quantity === 0 && !ticker && !name) continue
    const gak = parseDanishNumber(get('gak'))
    const lastPrice = parseDanishNumber(get('lastPrice'))
    const currency = (get('currency') || 'DKK').trim() || 'DKK'
    let marketValueDkk = parseDanishNumber(get('marketValueDkk'))
    if (marketValueDkk === 0 && quantity && lastPrice && currency.toUpperCase() === 'DKK') {
      marketValueDkk = quantity * lastPrice
    }
    let returnPct = parseDanishNumber(get('returnPct'))
    let returnDkk = parseDanishNumber(get('returnDkk'))
    if (returnDkk === 0 && quantity && gak && lastPrice && currency.toUpperCase() === 'DKK') {
      returnDkk = (lastPrice - gak) * quantity
    }
    if (returnPct === 0 && gak && lastPrice) {
      returnPct = ((lastPrice - gak) / gak) * 100
    }
    out.push({
      ticker: ticker || name.split(' ')[0],
      name: name || ticker,
      quantity,
      gak,
      lastPrice,
      currency,
      marketValueDkk,
      returnPct,
      returnDkk,
    })
  }
  return out
}

/* ─── Formatters ────────────────────────────────────────────────────── */
function fmtDkk(n: number): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('da-DK', { maximumFractionDigits: 0 }) + ' kr'
}
function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtPct(n: number): string {
  if (!isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + n.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}
function fmtSignedDkk(n: number): string {
  if (!isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + n.toLocaleString('da-DK', { maximumFractionDigits: 0 }) + ' kr'
}

/* ─── Navigation (matches /portefolje + /krisekob style) ────────────── */
function Nav() {
  const linkBase: React.CSSProperties = {
    color: '#999999',
    textDecoration: 'none',
  }
  const linkActive: React.CSSProperties = {
    color: '#111111',
    textDecoration: 'none',
    borderBottom: '1px solid #111111',
    paddingBottom: 2,
  }
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      padding: '10px 24px',
      background: 'rgba(242,239,230,0.97)',
      borderBottom: '1px solid rgba(0,0,0,0.09)',
      fontFamily: 'var(--font-dm-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap',
    }}>
      <span style={{ color: '#999999' }}>◈</span>
      <Link href="/portefolje" style={linkBase}>Min Portefølje</Link>
      <Link href="/krisekob" style={linkBase}>Krisekøb ETF</Link>
      <Link href="/investeringer" style={linkActive}>Investeringsoversigt</Link>
    </nav>
  )
}

/* ─── Section definitions ───────────────────────────────────────────── */
const SECTION_DEFS: { id: SectionId; label: string; hint: string; accent: string }[] = [
  { id: 'run2026',     label: 'The 2026 Run',         hint: 'OXY · PLTR · CELC',    accent: '#8a6a00' },
  { id: 'enkeltaktier', label: 'Enkeltaktier',         hint: 'Individuelle aktier',  accent: '#1a1a1a' },
  { id: 'etf',         label: 'ETF Portefølje',        hint: 'Brede indeks-fonde',   accent: '#2d6a3f' },
  { id: 'krypto',      label: 'Krypto',                hint: 'BTC · ETH · alt',      accent: '#5a3a8a' },
  { id: 'ask',         label: 'Aldersopsparing/ASK',   hint: 'Pension · langsigtet', accent: '#404040' },
]

/* ─── Persistence ───────────────────────────────────────────────────── */
const STORAGE_KEY = 'makro-signal:investeringer:v1'

interface PersistedState {
  sections: Record<SectionId, Position[]>
  activeSection: SectionId
  lastImport: string | null
  accountMap: Record<string, SectionId>
}

function loadPersisted(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!parsed || typeof parsed !== 'object') return null
    const s = parsed.sections ?? {}
    const am = (parsed.accountMap ?? {}) as Record<string, SectionId>
    return {
      sections: {
        run2026:      Array.isArray((s as Record<string, unknown>).run2026)      ? (s as Record<string, Position[]>).run2026      : [],
        enkeltaktier: Array.isArray((s as Record<string, unknown>).enkeltaktier) ? (s as Record<string, Position[]>).enkeltaktier : [],
        etf:          Array.isArray((s as Record<string, unknown>).etf)          ? (s as Record<string, Position[]>).etf          : [],
        krypto:       Array.isArray((s as Record<string, unknown>).krypto)       ? (s as Record<string, Position[]>).krypto       : [],
        ask:          Array.isArray((s as Record<string, unknown>).ask)          ? (s as Record<string, Position[]>).ask          : [],
      },
      activeSection: (parsed.activeSection ?? 'run2026') as SectionId,
      lastImport: parsed.lastImport ?? null,
      accountMap: typeof am === 'object' && am ? am : {},
    }
  } catch {
    return null
  }
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function InvesteringerPage() {
  const [sections, setSections] = useState<Record<SectionId, Position[]>>({
    run2026: [],
    enkeltaktier: [],
    etf: [],
    krypto: [],
    ask: [],
  })
  const [activeSection, setActiveSection] = useState<SectionId>('run2026')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<string | null>(null)
  const [accountMap, setAccountMap] = useState<Record<string, SectionId>>({})
  const [hydrated, setHydrated] = useState(false)

  // Load persisted state on first client render
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) {
      setSections(persisted.sections)
      setActiveSection(persisted.activeSection)
      setLastImport(persisted.lastImport)
      setAccountMap(persisted.accountMap)
    }
    setHydrated(true)
  }, [])

  // Save to localStorage whenever data changes (after hydration)
  useEffect(() => {
    if (!hydrated) return
    if (typeof window === 'undefined') return
    try {
      const payload: PersistedState = { sections, activeSection, lastImport, accountMap }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore quota / private mode errors
    }
  }, [sections, activeSection, lastImport, accountMap, hydrated])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const arr = Array.from(files)
    const newSections: Record<SectionId, Position[]> = {
      run2026: [...sections.run2026],
      enkeltaktier: [...sections.enkeltaktier],
      etf: [...sections.etf],
      krypto: [...sections.krypto],
      ask: [...sections.ask],
    }
    let imported = 0
    let firstSection: SectionId | null = null
    const newAccountMap: Record<string, SectionId> = { ...accountMap }
    for (const f of arr) {
      if (!/\.(csv|tsv|txt)$/i.test(f.name)) continue
      try {
        const text = await f.text()
        const rows = parseCsv(text)
        if (rows.length < 2) continue
        const header = rows[0]
        const data = rows.slice(1)
        const positions = rowsToPositions(header, data)
        if (positions.length === 0) continue
        const kontonummer = extractKontonummer(f.name)
        // If we already know this account, route to its mapped section.
        // Otherwise heuristic-guess and remember the mapping for future imports.
        const sec: SectionId = kontonummer && newAccountMap[kontonummer]
          ? newAccountMap[kontonummer]
          : guessSection(f.name, positions)
        if (kontonummer && !newAccountMap[kontonummer]) {
          newAccountMap[kontonummer] = sec
        }
        if (kontonummer) {
          for (const p of positions) p.kontonummer = kontonummer
        }
        if (firstSection === null) firstSection = sec
        newSections[sec] = [...newSections[sec], ...positions]
        imported += positions.length
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(`Kunne ikke parse ${f.name}: ${msg}`)
      }
    }
    setSections(newSections)
    setAccountMap(newAccountMap)
    if (imported > 0) {
      setLastImport(`${imported} positioner importeret · ${new Date().toLocaleString('da-DK')}`)
      if (firstSection) setActiveSection(firstSection)
    } else if (!error) {
      setError('Ingen positioner kunne læses fra filen. Tjek at det er en gyldig Nordnet CSV.')
    }
  }, [sections, error, accountMap])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }, [handleFiles])

  const clearSection = useCallback((id: SectionId) => {
    setSections(s => ({ ...s, [id]: [] }))
  }, [])

  const clearAll = useCallback(() => {
    if (!confirm('Ryd alle positioner i alle sektioner?')) return
    setSections({ run2026: [], enkeltaktier: [], etf: [], krypto: [], ask: [] })
    setLastImport(null)
    setAccountMap({})
  }, [])

  /* Move all positions belonging to a kontonummer to a new section,
     and remember the mapping so future imports of the same account go there. */
  const moveAccount = useCallback((kontonummer: string, target: SectionId) => {
    setSections(prev => {
      const next: Record<SectionId, Position[]> = {
        run2026: [], enkeltaktier: [], etf: [], krypto: [], ask: [],
      }
      for (const id of Object.keys(prev) as SectionId[]) next[id] = []
      const moved: Position[] = []
      for (const id of Object.keys(prev) as SectionId[]) {
        for (const p of prev[id]) {
          if (p.kontonummer === kontonummer) {
            moved.push(p)
          } else {
            next[id].push(p)
          }
        }
      }
      next[target] = [...next[target], ...moved]
      return next
    })
    setAccountMap(prev => ({ ...prev, [kontonummer]: target }))
    setActiveSection(target)
  }, [])

  // Totals
  const sectionTotals: Record<SectionId, { value: number; gain: number }> = {
    run2026:      { value: 0, gain: 0 },
    enkeltaktier: { value: 0, gain: 0 },
    etf:          { value: 0, gain: 0 },
    krypto:       { value: 0, gain: 0 },
    ask:          { value: 0, gain: 0 },
  }
  for (const def of SECTION_DEFS) {
    for (const p of sections[def.id]) {
      sectionTotals[def.id].value += p.marketValueDkk
      sectionTotals[def.id].gain += p.returnDkk
    }
  }
  const totalValue = SECTION_DEFS.reduce((acc, d) => acc + sectionTotals[d.id].value, 0)
  const totalGain = SECTION_DEFS.reduce((acc, d) => acc + sectionTotals[d.id].gain, 0)
  const totalCost = totalValue - totalGain
  const totalPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  const activeDef = SECTION_DEFS.find(d => d.id === activeSection)!
  const activePositions = sections[activeSection]
  const activeValue = sectionTotals[activeSection].value
  const activeGain = sectionTotals[activeSection].gain
  const activeCost = activeValue - activeGain
  const activePct = activeCost > 0 ? (activeGain / activeCost) * 100 : 0

  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'

  const gainColor = (n: number) => n > 0 ? '#2d6a3f' : n < 0 ? '#8b1c1c' : '#777777'

  return (
    <div style={{ minHeight: '100vh', background: '#e9e5da' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ─── Page Header ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#111111', letterSpacing: '0.12em', marginBottom: 8 }}>
              ◈ INVESTERINGSOVERSIGT
            </div>
            <h1 style={{ fontFamily: corm, fontSize: 42, fontWeight: 600, color: '#111111', margin: 0, lineHeight: 1.1 }}>
              Min{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 500 }}>Portefølje</em>
            </h1>
            <div style={{ fontFamily: mono, fontSize: 11, color: '#999999', marginTop: 6 }}>
              Nordnet CSV upload · automatisk sektionsgenkendelse · lokal parsing
            </div>
          </div>

          {/* Total summary top right */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#999999', marginBottom: 4 }}>
              SAMLET VÆRDI
            </div>
            <div style={{ fontFamily: corm, fontSize: 36, fontWeight: 600, lineHeight: 1, color: '#111111' }}>
              {totalValue > 0 ? totalValue.toLocaleString('da-DK', { maximumFractionDigits: 0 }) : '—'}
              <span style={{ fontSize: 16, color: '#999999', marginLeft: 6, fontFamily: mono }}>kr</span>
            </div>
            {totalValue > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, fontFamily: mono, color: gainColor(totalGain) }}>
                {fmtSignedDkk(totalGain)} · {fmtPct(totalPct)}
              </div>
            )}
          </div>
        </div>

        {/* ─── Upload zone ─── */}
        <div style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 8,
          padding: 6,
          marginBottom: 20,
        }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? '#111111' : 'rgba(0,0,0,0.18)'}`,
              borderRadius: 6,
              padding: '28px 20px',
              textAlign: 'center',
              background: dragOver ? 'rgba(0,0,0,0.05)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555555', marginBottom: 8 }}>
              ⬇ TRÆK CSV HER
            </div>
            <div style={{ fontFamily: corm, fontSize: 22, color: '#111111', marginBottom: 6 }}>
              Slip <em>Nordnet eksport-filer</em> for at importere
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#777777', marginBottom: 16 }}>
              Semikolon-separeret · DKK · sektion gættes ud fra filnavn og tickers
            </div>
            <label
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(0,0,0,0.18)',
                color: '#111111',
                fontFamily: mono,
                fontSize: 10,
                padding: '8px 18px',
                borderRadius: 6,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              eller vælg filer
              <input
                type="file"
                multiple
                accept=".csv,.tsv,.txt,text/csv"
                onChange={onFileInput}
                style={{ display: 'none' }}
              />
            </label>
            {lastImport && (
              <div style={{ marginTop: 14, fontFamily: mono, fontSize: 10, color: '#2d6a3f' }}>
                ● {lastImport}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 14, fontFamily: mono, fontSize: 10, color: '#8b1c1c' }}>
                ● {error}
              </div>
            )}
          </div>

          {totalValue > 0 && (
            <div style={{ marginTop: 10, padding: '6px 10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={clearAll}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(139,28,28,0.3)',
                  color: '#8b1c1c',
                  fontFamily: mono,
                  fontSize: 10,
                  padding: '5px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                ↻ Ryd alle
              </button>
            </div>
          )}
        </div>

        {/* ─── Pill nav for sections ─── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {SECTION_DEFS.map(def => {
            const isActive = activeSection === def.id
            const count = sections[def.id].length
            const value = sectionTotals[def.id].value
            return (
              <button
                key={def.id}
                onClick={() => setActiveSection(def.id)}
                style={{
                  background: isActive ? def.accent : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isActive ? def.accent : 'rgba(0,0,0,0.10)'}`,
                  color: isActive ? '#ffffff' : '#555555',
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  padding: '8px 14px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isActive ? '#ffffff' : def.accent,
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: 500 }}>{def.label}</span>
                <span style={{ color: isActive ? 'rgba(255,255,255,0.6)' : '#aaaaaa' }}>·</span>
                <span style={{ fontSize: 9, opacity: 0.85 }}>{count} pos</span>
                {value > 0 && (
                  <>
                    <span style={{ color: isActive ? 'rgba(255,255,255,0.6)' : '#aaaaaa' }}>·</span>
                    <span style={{ fontSize: 9, opacity: 0.85 }}>{Math.round(value / 1000)}k</span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* ─── Active section card ─── */}
        <div style={{
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <div style={{ height: 2, background: activeDef.accent }} />
          <div style={{ padding: '20px 22px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#999999', marginBottom: 4 }}>
                  {activeDef.hint}
                </div>
                <div style={{ fontFamily: corm, fontSize: 26, fontWeight: 600, color: '#111111', lineHeight: 1 }}>
                  {activeDef.label}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#999999', marginBottom: 4 }}>
                  SEKTION TOTAL
                </div>
                <div style={{ fontFamily: corm, fontSize: 26, fontWeight: 600, color: '#111111', lineHeight: 1 }}>
                  {activeValue > 0 ? fmtDkk(activeValue) : '—'}
                </div>
                {activeValue > 0 && (
                  <div style={{ marginTop: 4, fontFamily: mono, fontSize: 10, color: gainColor(activeGain) }}>
                    {fmtSignedDkk(activeGain)} · {fmtPct(activePct)}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Account chips (move to other section) ─── */}
            {(() => {
              const accountStats = new Map<string, { count: number; value: number }>()
              for (const p of activePositions) {
                const key = p.kontonummer ?? ''
                if (!key) continue
                const cur = accountStats.get(key) ?? { count: 0, value: 0 }
                cur.count++
                cur.value += p.marketValueDkk
                accountStats.set(key, cur)
              }
              if (accountStats.size === 0) return null
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {Array.from(accountStats.entries()).map(([konto, s]) => (
                    <div key={konto} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(0,0,0,0.10)',
                      borderRadius: 999,
                      padding: '5px 10px 5px 12px',
                      fontFamily: mono, fontSize: 10, color: '#444444',
                    }}>
                      <span style={{ color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>Konto</span>
                      <span style={{ color: '#111111', fontWeight: 500 }}>{konto}</span>
                      <span style={{ color: '#aaaaaa' }}>·</span>
                      <span>{s.count} pos</span>
                      <span style={{ color: '#aaaaaa' }}>·</span>
                      <span>{Math.round(s.value / 1000)}k</span>
                      <span style={{ color: '#aaaaaa', marginLeft: 4 }}>→</span>
                      <select
                        value={activeSection}
                        onChange={(e) => moveAccount(konto, e.target.value as SectionId)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(0,0,0,0.15)',
                          borderRadius: 999,
                          fontFamily: mono, fontSize: 10,
                          padding: '2px 6px',
                          color: '#111111',
                          cursor: 'pointer',
                        }}
                      >
                        {SECTION_DEFS.map(def => (
                          <option key={def.id} value={def.id}>{def.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )
            })()}

            {activePositions.length === 0 ? (
              <div style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: '#999999',
                fontFamily: mono,
                fontSize: 11,
                border: '1px dashed rgba(0,0,0,0.12)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.25)',
              }}>
                Ingen positioner i denne sektion endnu — træk en Nordnet CSV ind ovenfor.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Ticker', 'Navn', 'Antal', 'GAK', 'Kurs', 'Værdi (DKK)', 'Afkast %', 'Afkast (DKK)'].map((h, i) => (
                        <th key={h} style={{
                          textAlign: i >= 2 ? 'right' : 'left',
                          padding: '0 12px 10px 0',
                          borderBottom: '1px solid rgba(0,0,0,0.10)',
                          color: '#999999',
                          fontWeight: 400,
                          fontSize: 9,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePositions.map((p, i) => (
                      <tr key={`${p.ticker}-${i}`}>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#111111', fontSize: 12, fontWeight: 500 }}>
                          {p.ticker}
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#555555', fontFamily: corm, fontSize: 14 }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#444444', textAlign: 'right' }}>
                          {fmtNum(p.quantity, p.quantity % 1 === 0 ? 0 : 4)}
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#444444', textAlign: 'right' }}>
                          {fmtNum(p.gak)} <span style={{ color: '#aaaaaa', fontSize: 9 }}>{p.currency}</span>
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#444444', textAlign: 'right' }}>
                          {fmtNum(p.lastPrice)} <span style={{ color: '#aaaaaa', fontSize: 9 }}>{p.currency}</span>
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#111111', textAlign: 'right', fontWeight: 500 }}>
                          {fmtDkk(p.marketValueDkk)}
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'right', color: gainColor(p.returnPct) }}>
                          {fmtPct(p.returnPct)}
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'right', color: gainColor(p.returnDkk) }}>
                          {fmtSignedDkk(p.returnDkk)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ padding: '14px 12px 0 0', color: '#999999', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Total · {activePositions.length} positioner
                      </td>
                      <td style={{ padding: '14px 12px 0 0', textAlign: 'right', color: '#111111', fontSize: 12, fontWeight: 500 }}>
                        {fmtDkk(activeValue)}
                      </td>
                      <td style={{ padding: '14px 12px 0 0', textAlign: 'right', fontSize: 11, color: gainColor(activeGain) }}>
                        {fmtPct(activePct)}
                      </td>
                      <td style={{ padding: '14px 12px 0 0', textAlign: 'right', fontSize: 11, color: gainColor(activeGain) }}>
                        {fmtSignedDkk(activeGain)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {activePositions.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => clearSection(activeSection)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.12)',
                    color: '#777777',
                    fontFamily: mono,
                    fontSize: 9,
                    padding: '5px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Ryd sektion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <footer style={{ textAlign: 'center', fontFamily: mono, fontSize: 9, color: '#aaaaaa', lineHeight: 1.6, marginTop: 30 }}>
          Lokal parsing · ingen data forlader din browser · Kun til informationsformål
        </footer>

      </div>
    </div>
  )
}
