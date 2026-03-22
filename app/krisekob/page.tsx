'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const mono = 'var(--font-dm-mono)'
const serif = '"Cormorant Garamond", Georgia, serif'

const LAST_BUY_DATE = new Date('2024-09-01')
const COOLDOWN_DAYS = 90
const MAX_BUYS_PER_YEAR = 3

interface MarketData {
  fearGreedIndex: number
  sp500Price: number
  sp500_52wHigh: number
  ismPMI: number
  sahmRule: number
  updatedAt: string
}

function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(242,239,230,0.97)', borderBottom: '1px solid rgba(0,0,0,0.09)', fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ color: '#999999' }}>◈</span>
      <Link href="/portefolje" style={{ color: '#999999', textDecoration: 'none' }}>Min Portefølje</Link>
      <Link href="/krisekob" style={{ color: '#111111', textDecoration: 'none', borderBottom: '1px solid #111111', paddingBottom: 2 }}>Krisekøb ETF</Link>
    </nav>
  )
}

export default function KrisekobPage() {
  const [mkt, setMkt] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const r = await fetch('/api/data')
      if (!r.ok) return
      const j = await r.json()
      setMkt(j as MarketData)
    } catch { /* noop */ }
    setLoading(false)
  }

  useEffect(() => { void fetchData() }, [])

  const spPct = mkt ? (mkt.sp500Price - mkt.sp500_52wHigh) / mkt.sp500_52wHigh * 100 : 0
  const ind1ok = mkt ? mkt.fearGreedIndex < 25 : false
  const ind2ok = mkt ? spPct < -10 : false
  const ind3ok = mkt ? mkt.ismPMI < 49 : false
  const ind4ok = mkt ? mkt.sahmRule > 0.5 : false
  const score = [ind1ok, ind2ok, ind3ok, ind4ok].filter(Boolean).length

  const badgeLabel: string = score <= 1 ? 'VENT' : score === 2 ? 'OBSERVÉR' : score === 3 ? 'KØB MULIG' : 'KØB NU'
  const badgeColor: string = score <= 1 ? '#8b1c1c' : score === 2 ? '#7a5c00' : '#2d6a3f'
  const buyAmount = score === 3 ? 6250 : score === 4 ? 12500 : 0

  const daysSinceLastBuy = Math.floor((Date.now() - LAST_BUY_DATE.getTime()) / (1000 * 60 * 60 * 24))
  const cooldownRemaining = Math.max(0, COOLDOWN_DAYS - daysSinceLastBuy)
  const nextBuyDate = new Date(LAST_BUY_DATE.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  const nextBuyStr = nextBuyDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
  const lastBuyStr = LAST_BUY_DATE.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
  const cooldownActive = cooldownRemaining > 0

  const etfs = [
    { name: 'NASDAQ 100', weight: 0.50 },
    { name: 'MSCI World Materials', weight: 0.25 },
    { name: 'Aerospace & Defence', weight: 0.15 },
    { name: 'Global X Uranium', weight: 0.10 },
  ]

  const cardStyle = { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8 }

  return (
    <div style={{ minHeight: '100vh', background: '#f2efe6', fontFamily: serif }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: '#999999', marginBottom: 8, textTransform: 'uppercase' as const }}>◈ Makro Signal</div>
            <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em', color: '#111111', margin: 0, lineHeight: 1.1 }}>
              Krisekøb <em>ETF</em>
            </h1>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#777777', marginTop: 10, letterSpacing: '0.04em' }}>
              Køb ekstra ETF&apos;er når markedet er billigt
            </div>
          </div>
          <button onClick={() => { void fetchData() }} disabled={loading} style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '8px 16px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, background: 'transparent', color: loading ? '#999999' : '#111111', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Henter...' : 'Opdater'}
          </button>
        </div>

        {/* SEKTION 1 */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 1 — Indikatorer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Fear & Greed', value: mkt ? String(mkt.fearGreedIndex) : '—', sub: mkt ? (ind1ok ? 'Under 25 ●' : 'Over 25 ●') : '—', ok: ind1ok },
            { label: 'S&P 500 fra high', value: mkt ? spPct.toFixed(1) + '%' : '—', sub: mkt ? (ind2ok ? 'Under −10% ●' : 'Over −10% ●') : '—', ok: ind2ok },
            { label: 'ISM PMI', value: mkt ? String(mkt.ismPMI) : '—', sub: mkt ? (ind3ok ? 'Under 49 ●' : 'Over 49 ●') : '—', ok: ind3ok },
            { label: 'Sahm-regel', value: mkt ? (mkt.sahmRule ?? 0).toFixed(2) : '—', sub: mkt ? (ind4ok ? 'Over 0.5 ●' : 'Under 0.5 ●') : '—', ok: ind4ok },
          ].map((ind) => (
            <div key={ind.label} style={{ ...cardStyle, padding: '16px 18px' }}>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 8 }}>{ind.label}</div>
              <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 300, color: mkt ? (ind.ok ? '#2d6a3f' : '#8b1c1c') : '#cccccc', lineHeight: 1 }}>{ind.value}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: mkt ? (ind.ok ? '#2d6a3f' : '#8b1c1c') : '#cccccc', marginTop: 6 }}>{ind.sub}</div>
            </div>
          ))}
        </div>

        {/* SEKTION 2 */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 2 — Signal og Score</div>
        <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Score {score} / 4</div>
            <div style={{ fontFamily: mono, fontSize: 20, fontWeight: score === 4 ? 700 : 400, color: badgeColor, letterSpacing: '0.06em' }}>{badgeLabel}</div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: badgeColor, border: '1px solid ' + badgeColor + '55', borderRadius: 4, padding: '8px 20px', letterSpacing: '0.06em' }}>
            {score} / 4
          </div>
        </div>

        {/* SEKTION 3 */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 3 — Købsbeløb</div>
        <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 28 }}>
          {buyAmount > 0 ? (
            <div>
              <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 300, color: cooldownActive ? '#999999' : '#2d6a3f', marginBottom: 6 }}>
                {buyAmount.toLocaleString('da-DK')} DKK
              </div>
              {cooldownActive ? (
                <div style={{ fontFamily: mono, fontSize: 10, color: '#8b1c1c' }}>
                  Cooldown aktiv — næste køb muligt {nextBuyStr} ({cooldownRemaining} dage tilbage)
                </div>
              ) : (
                <div style={{ fontFamily: mono, fontSize: 10, color: '#2d6a3f' }}>
                  Køb muligt — sidst købt {lastBuyStr}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 300, color: '#bbbbbb', marginBottom: 6 }}>Ingen handling</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: '#999999' }}>Score skal være mindst 3 for at udløse et krisekøb</div>
            </div>
          )}
          <div style={{ marginTop: 14, fontFamily: mono, fontSize: 9, color: '#aaaaaa', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 12 }}>
            Score 3 → 6.250 DKK &nbsp;·&nbsp; Score 4 → 12.500 DKK &nbsp;·&nbsp; Næste mulige køb: {nextBuyStr} &nbsp;·&nbsp; Max {MAX_BUYS_PER_YEAR} krisekøb/år
          </div>
        </div>

        {/* SEKTION 4 */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 4 — ETF Fordeling</div>
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12, fontFamily: mono, fontSize: 9, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>ETF</span>
            <span style={{ width: 40, textAlign: 'right' as const }}>Vægt</span>
            <span style={{ width: 80, textAlign: 'right' as const }}>6.250</span>
            <span style={{ width: 90, textAlign: 'right' as const }}>12.500</span>
          </div>
          {etfs.map((etf) => (
            <div key={etf.name} style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '7px 0' }}>
              <span style={{ flex: 1, fontFamily: mono, fontSize: 10, color: '#333333' }}>{etf.name}</span>
              <span style={{ width: 40, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 100)}%</span>
              <span style={{ width: 80, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 6250).toLocaleString('da-DK')} kr</span>
              <span style={{ width: 90, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 12500).toLocaleString('da-DK')} kr</span>
            </div>
          ))}
        </div>

        {/* SEKTION 5 */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 5 — Regler</div>
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 48 }}>
          {[
            '90 dages cooldown mellem hvert krisekøb',
            'Max 3 krisekøb per år',
            'Kun køb — aldrig sælg baseret på dette signal',
          ].map((rule, i, arr) => (
            <div key={rule} style={{ fontFamily: mono, fontSize: 10, color: '#444444', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              {rule}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontFamily: mono, fontSize: 9, color: '#aaaaaa', letterSpacing: '0.08em', textAlign: 'center' as const }}>
          Nordnet · ETF månedsopsparing · Ikke finansiel rådgivning
        </div>
      </div>
    </div>
  )
}
