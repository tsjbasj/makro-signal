'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const mono = 'var(--font-dm-mono)'
const serif = '"Cormorant Garamond", Georgia, serif'

const COOLDOWN_DAYS = 90
const MAX_BUYS_PER_YEAR = 3
const MAX_TOTAL = 45000

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
      <Link href="/krisekob" style={{ color: '#111111', textDecoration: 'none', borderBottom: '1px solid #111111' }}>Krisekøb ETF</Link>
    </nav>
  )
}

export default function KrisekobPage() {
  const [mkt, setMkt] = useState<MarketData | null>(null)
  const [lastBuyDate, setLastBuyDate] = useState<Date | null>(null)
  const [scoreAtLastBuy, setScoreAtLastBuy] = useState<number>(0)

  useEffect(() => {
    const d = localStorage.getItem('dateOfLastBuy')
    const s = localStorage.getItem('scoreAtLastBuy')
    setLastBuyDate(d ? new Date(d) : new Date('2024-09-01'))
    if (s) setScoreAtLastBuy(parseInt(s, 10))
  }, [])

  async function fetchData() {
    const r = await fetch('/api/data')
    if (!r.ok) return
    const j = await r.json()
    setMkt(j as MarketData)
  }
  useEffect(() => { void fetchData() }, [])

  const spPct = mkt ? (mkt.sp500Price - mkt.sp500_52wHigh) / mkt.sp500_52wHigh * 100 : 0

  // S&P 500 — 4 trin (max 4 point)
  const sp1 = mkt ? spPct <= -10 : false
  const sp2 = mkt ? spPct <= -15 : false
  const sp3 = mkt ? spPct <= -20 : false
  const sp4 = mkt ? spPct <= -25 : false
  const spScore = [sp1, sp2, sp3, sp4].filter(Boolean).length

  // Fear & Greed — 2 trin (max 2 point)
  const fg1 = mkt ? mkt.fearGreedIndex <= 35 : false
  const fg2 = mkt ? mkt.fearGreedIndex <= 20 : false
  const fgScore = [fg1, fg2].filter(Boolean).length

  // ISM PMI — 2 trin (max 2 point)
  const ism1 = mkt ? mkt.ismPMI <= 49 : false
  const ism2 = mkt ? mkt.ismPMI <= 47 : false
  const ismScore = [ism1, ism2].filter(Boolean).length

  // Sahm-regel — 2 trin (max 2 point)
  const sahm1 = mkt ? (mkt.sahmRule ?? 0) >= 0.5 : false
  const sahm2 = mkt ? (mkt.sahmRule ?? 0) >= 1.0 : false
  const sahmScore = [sahm1, sahm2].filter(Boolean).length

  const score = spScore + fgScore + ismScore + sahmScore  // max 10

  const badgeLabel: string = score <= 2 ? 'VENT' : score === 3 ? 'KØB MULIG' : score <= 6 ? 'KØB' : 'KØB NU'
  const badgeColor: string = score <= 2 ? '#8b1c1c' : score === 3 ? '#7a5c00' : '#2d6a3f'
  const buyAmount = score === 3 ? 7500 : score >= 4 && score <= 6 ? 15000 : score >= 7 ? 22500 : 0

  const daysSinceLastBuy = lastBuyDate
    ? Math.floor((Date.now() - lastBuyDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999
  const cooldownRemaining = Math.max(0, COOLDOWN_DAYS - daysSinceLastBuy)
  const pointsSinceLastBuy = score - scoreAtLastBuy
  const cooldownLifted = pointsSinceLastBuy >= 2
  const cooldownActive = cooldownRemaining > 0 && !cooldownLifted

  const nextBuyDate = lastBuyDate
    ? new Date(lastBuyDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    : null
  const nextBuyStr = nextBuyDate
    ? nextBuyDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const lastBuyStr = lastBuyDate
    ? lastBuyDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Ikke registreret'

  function registerBuy() {
    const now = new Date()
    localStorage.setItem('dateOfLastBuy', now.toISOString())
    localStorage.setItem('scoreAtLastBuy', String(score))
    setLastBuyDate(now)
    setScoreAtLastBuy(score)
  }

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
              Køb ekstra ETF-positioner under markedskriser · Separat fra aktieportefølje
            </div>
          </div>
          <button onClick={() => void fetchData()} style={{ fontFamily: mono, fontSize: 9, background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', color: '#666666', marginTop: 8 }}>
            ↺ Opdater
          </button>
        </div>

        {/* SEKTION 1 — Indikatorer */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 1 — Indikatorer</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            {
              label: 'S\u0026P 500 fra high',
              value: mkt ? spPct.toFixed(1) + '%' : '—',
              ok: sp1, pts: spScore, max: 4, note: '',
              steps: [
                { label: 'Under 10%', met: sp1 },
                { label: 'Under 15%', met: sp2 },
                { label: 'Under 20%', met: sp3 },
                { label: 'Under 25%', met: sp4 },
              ],
            },
            {
              label: 'Fear \u0026 Greed',
              value: mkt ? String(mkt.fearGreedIndex) : '—',
              ok: fg1, pts: fgScore, max: 2, note: '',
              steps: [
                { label: '\u2264 35', met: fg1 },
                { label: '\u2264 20', met: fg2 },
              ],
            },
            {
              label: 'ISM PMI',
              value: mkt ? String(mkt.ismPMI) : '—',
              ok: ism1, pts: ismScore, max: 2, note: 'feb',
              steps: [
                { label: 'Under 49', met: ism1 },
                { label: 'Under 47', met: ism2 },
              ],
            },
            {
              label: 'Sahm-regel',
              value: mkt ? (mkt.sahmRule ?? 0).toFixed(2) : '—',
              ok: sahm1, pts: sahmScore, max: 2, note: '',
              steps: [
                { label: 'Over 0.5', met: sahm1 },
                { label: 'Over 1.0', met: sahm2 },
              ],
            },
          ].map((ind) => (
            <div key={ind.label} style={{ ...cardStyle, padding: '16px 18px' }}>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 8 }}>{ind.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 300, color: mkt ? (ind.ok ? '#2d6a3f' : '#8b1c1c') : '#cccccc', lineHeight: 1 }}>{ind.value}</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#aaaaaa' }}>{ind.pts}/{ind.max}pt</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '3px 10px', marginTop: 6, alignItems: 'center' }}>
                {ind.steps.map((step, i) => (
                  <span key={i} style={{ fontFamily: mono, fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3, color: mkt ? (step.met ? '#2d6a3f' : '#bbbbbb') : '#cccccc' }}>
                    <span style={{ color: step.met ? '#4a7c59' : '#a63d2f', fontSize: 8 }}>{'●'}</span>
                    {step.label}
                  </span>
                ))}
                {ind.note ? <span style={{ fontFamily: mono, fontSize: 9, color: '#aaaaaa' }}>{ind.note}</span> : null}
              </div>
            </div>
          ))}
        </div>

        {/* SEKTION 2 — Signal og Score */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 2 — Signal og Score</div>
        <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Score {score} / 10</div>
            <div style={{ fontFamily: mono, fontSize: 20, fontWeight: score >= 7 ? 700 : 400, color: badgeColor, letterSpacing: '0.06em' }}>{badgeLabel}</div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: badgeColor, border: '1px solid ' + badgeColor + '55', borderRadius: 4, padding: '8px 20px', letterSpacing: '0.06em' }}>
            {score} / 10
          </div>
        </div>

        {/* SEKTION 3 — Beløb */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 3 — Beløb</div>
        <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 28 }}>
          {buyAmount > 0 ? (
            <div>
              <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 300, color: cooldownActive ? '#999999' : '#2d6a3f', marginBottom: 6 }}>
                {buyAmount.toLocaleString('da-DK')} DKK
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: cooldownActive ? '#8b1c1c' : '#2d6a3f', marginBottom: 12 }}>
                {cooldownActive
                  ? `Cooldown: Aktiv — ${cooldownRemaining} dage tilbage`
                  : cooldownLifted
                    ? `Cooldown: Ophaevet — scoren er steget ${pointsSinceLastBuy} point siden sidste kob`
                    : 'Cooldown: Ingen aktiv'
                }
              </div>
              {!cooldownActive && (
                <button onClick={registerBuy} style={{ fontFamily: mono, fontSize: 9, background: '#2d6a3f', border: 'none', borderRadius: 3, padding: '5px 14px', cursor: 'pointer', color: '#ffffff', letterSpacing: '0.06em' }}>
                  Registrér køb
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 300, color: '#bbbbbb', marginBottom: 6 }}>Ingen handling</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: '#999999' }}>Score skal være mindst 3 for at aktivere et krisekøb</div>
            </div>
          )}
          <div style={{ fontFamily: mono, fontSize: 9, color: '#aaaaaa', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 12, marginTop: 12 }}>
            Score 3 → 7.500 DKK · Score 4–6 → 15.000 DKK · Score 7–10 → 22.500 DKK · Max {MAX_TOTAL.toLocaleString('da-DK')} DKK total · Næste mulige køb: {nextBuyStr} · Max {MAX_BUYS_PER_YEAR} krisekøb/år
          </div>
        </div>

        {/* SEKTION 4 — ETF Fordeling */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 4 — ETF Fordeling</div>
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12, fontFamily: mono, fontSize: 9, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>ETF</span>
            <span style={{ width: 40, textAlign: 'right' as const }}>Vægt</span>
            <span style={{ width: 72, textAlign: 'right' as const }}>7.500</span>
            <span style={{ width: 72, textAlign: 'right' as const }}>15.000</span>
            <span style={{ width: 72, textAlign: 'right' as const }}>22.500</span>
          </div>
          {etfs.map((etf) => (
            <div key={etf.name} style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '7px 0' }}>
              <span style={{ flex: 1, fontFamily: mono, fontSize: 10, color: '#333333' }}>{etf.name}</span>
              <span style={{ width: 40, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 100)}%</span>
              <span style={{ width: 72, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 7500).toLocaleString('da-DK')} kr</span>
              <span style={{ width: 72, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 15000).toLocaleString('da-DK')} kr</span>
              <span style={{ width: 72, fontFamily: mono, fontSize: 10, color: '#555555', textAlign: 'right' as const }}>{Math.round(etf.weight * 22500).toLocaleString('da-DK')} kr</span>
            </div>
          ))}
        </div>

        {/* SEKTION 5 — Regler */}
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#999999', marginBottom: 10 }}>Sektion 5 — Regler</div>
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 48 }}>
          {[
            '90 dages cooldown mellem hvert krisekøb',
            'Cooldown ophæves automatisk hvis scoren stiger 2 point siden sidste køb',
            'Max 3 krisekøb per år · Max 45.000 DKK total per krise',
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
