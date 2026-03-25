'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const mono = 'var(--font-dm-mono)'
const serif = 'var(--font-cormorant)'

type Position = {
  ticker: string; navn: string; børs: string; antalAktier: number; købekurs: number
  investeret: number; stopLoss: { tageStilling: number; sælgAltid: number }
  kursmål: { tageStilling: number; sælgAltid: number }
  accentFarve: string; tema: string; særregel: string | null
}
interface StockPrice { ticker: string; price: number; change1d: number }
interface PriceData { stocks: StockPrice[]; lastUpdated: string }
interface Erstatning { ticker: string; navn: string; begrundelse: string }
interface AnalyseItem { ticker: string; signal: string; begrundelse: string; erstatning: Erstatning | null }
interface AnalyseData { analyser: AnalyseItem[]; porteføljeKommentar: string; analyseDato: string }

const POSITIONS: Position[] = [
  { ticker: 'OXY', navn: 'Occidental Petroleum', børs: 'NYSE', antalAktier: 29, købekurs: 57.90, investeret: 12000,
    stopLoss: { tageStilling: 46, sælgAltid: 35 }, kursmål: { tageStilling: 68, sælgAltid: 75 },
    accentFarve: '#f59e0b', tema: 'Energi · Iran-konflikt', særregel: null },
  { ticker: 'PLTR', navn: 'Palantir Technologies', børs: 'NASDAQ', antalAktier: 9, købekurs: 151.40, investeret: 10000,
    stopLoss: { tageStilling: 110, sælgAltid: 91 }, kursmål: { tageStilling: 200, sælgAltid: 230 },
    accentFarve: '#6366f1', tema: 'AI · Forsvar · Pentagon', særregel: null },
  { ticker: 'CELC', navn: 'Celcuity Inc.', børs: 'NASDAQ', antalAktier: 10, købekurs: 114.00, investeret: 8000,
    stopLoss: { tageStilling: 80, sælgAltid: 68 }, kursmål: { tageStilling: 180, sælgAltid: 220 },
    accentFarve: '#22c55e', tema: 'Biotech · FDA · CELC',
    særregel: 'CELC FDA-regel: Uanset kurs — sælg dagen EFTER FDA-beslutningen 17. juli 2026' },
]
const STARTKAPITAL = 30000
const USD_DKK = 6.90

function PriceRangeBar({ pos, currentPrice }: { pos: Position; currentPrice: number }) {
  const lo = pos.stopLoss.sælgAltid
  const hi = pos.kursmål.sælgAltid
  const range = hi - lo
  const clamp = Math.max(lo, Math.min(hi, currentPrice))
  const pricePct = ((clamp - lo) / range) * 100
  const købPct = ((pos.købekurs - lo) / range) * 100
  const stopTagPct = ((pos.stopLoss.tageStilling - lo) / range) * 100
  const målTagPct = ((pos.kursmål.tageStilling - lo) / range) * 100
  const col = currentPrice <= pos.stopLoss.tageStilling ? '#ef4444' : currentPrice >= pos.kursmål.tageStilling ? '#22c55e' : '#f59e0b'
  return (
    <div style={{ marginTop: 14, marginBottom: 4 }}>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 0, width: stopTagPct + '%', height: '100%', background: 'rgba(239,68,68,0.18)', borderRadius: '4px 0 0 4px' }} />
        <div style={{ position: 'absolute', left: målTagPct + '%', right: 0, height: '100%', background: 'rgba(34,197,94,0.18)', borderRadius: '0 4px 4px 0' }} />
        <div style={{ position: 'absolute', left: købPct + '%', top: -2, transform: 'translateX(-50%)', width: 2, height: 10, background: 'rgba(255,255,255,0.35)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: pricePct + '%', top: -4, transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: col, border: '2px solid #07090f', zIndex: 2 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 9, marginBottom: 5 }}>
        <span style={{ color: '#ef4444' }}>{'Sælg $' + lo}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'Købt $' + pos.købekurs}</span>
        <span style={{ color: '#22c55e' }}>{'Sælg $' + hi}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 8, color: '#555555' }}>
        <span>{'⬇ Tag stilling ved $' + pos.stopLoss.tageStilling}</span>
        <span>{'⬆ Tag stilling ved $' + pos.kursmål.tageStilling}</span>
      </div>
    </div>
  )
}

function SignalBadge({ signal }: { signal: string }) {
  const isHold = signal === 'HOLD'
  const isBuy = signal === 'KØB MERE'
  const bg = isHold ? 'rgba(245,158,11,0.12)' : isBuy ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
  const bdr = isHold ? 'rgba(245,158,11,0.3)' : isBuy ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
  const color = isHold ? '#f59e0b' : isBuy ? '#22c55e' : '#ef4444'
  return (
    <div style={{ display: 'inline-block', background: bg, border: '1px solid ' + bdr, borderRadius: 4, padding: '4px 10px', fontFamily: mono, fontSize: 10, color, letterSpacing: '0.08em', fontWeight: 600 }}>
      {signal}
    </div>
  )
}

export default function PortfolioPage() {
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [analyseData, setAnalyseData] = useState<AnalyseData | null>(null)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [analyseError, setAnalyseError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { setNow(new Date()) }, [])

  const start = new Date('2026-03-17')
  const slut = new Date('2026-12-31')
  const totalDays = Math.ceil((slut.getTime() - start.getTime()) / 86400000)
  const passedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000))
  const dageTilbage = Math.max(0, Math.ceil((slut.getTime() - now.getTime()) / 86400000))
  const progressPct = Math.max(0, Math.min(100, (passedDays / totalDays) * 100))

  function getPrice(t: string) { return priceData?.stocks?.find((s: StockPrice) => s.ticker === t)?.price ?? null }
  function getChange(t: string) { return priceData?.stocks?.find((s: StockPrice) => s.ticker === t)?.change1d ?? null }

  const aktuelVærdi = POSITIONS.reduce((sum, p) => sum + p.antalAktier * (getPrice(p.ticker) ?? p.købekurs) * USD_DKK, 0)
  const afkastKr = aktuelVærdi - STARTKAPITAL
  const afkastPct = (afkastKr / STARTKAPITAL) * 100

  async function fetchKurser() {
    setPriceLoading(true); setPriceError(null)
    try {
      const res = await fetch('/api/portfolio')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPriceData(data)
    } catch (e) { setPriceError(e instanceof Error ? e.message.slice(0, 80) : 'Fejl') }
    finally { setPriceLoading(false) }
  }

  async function fetchAnalyse() {
    setAnalyseLoading(true); setAnalyseError(null)
    try {
      const res = await fetch('/api/portfolio-analyse')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalyseData(data)
    } catch (e) { setAnalyseError(e instanceof Error ? e.message.slice(0, 100) : 'Fejl') }
    finally { setAnalyseLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090f' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(7,9,15,0.97)', borderBottom: '1px solid rgba(0,0,0,0.05)', fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#999999' }}>◈</span>
        <Link href="/" style={{ color: '#999999', textDecoration: 'none' }}>Makro Signal</Link>
        <Link href="/portfolio" style={{ color: '#111111', textDecoration: 'none', borderBottom: '1px solid #111111', paddingBottom: 2 }}>The 2026 Run</Link>
        <Link href="/radar" style={{ color: '#999999', textDecoration: 'none' }}>Aktie Radar</Link>
        <Link href="/portefølje" style={{ color: '#999999', textDecoration: 'none' }}>Min Portefølje</Link>
      </nav>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444444', marginBottom: 6 }}>◈ THE 2026 RUN</div>
            <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 600, color: '#e8e4da', margin: 0, lineHeight: 1.1 }}>
              Portefølje <em style={{ fontWeight: 400 }}>31. dec 2026</em>
            </h1>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#444444', marginTop: 6, letterSpacing: '0.04em' }}>
              Høj risiko · Nordnet aktiesparekonto · 3 positioner
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={fetchKurser} disabled={priceLoading} style={{ fontFamily: mono, fontSize: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: priceLoading ? '#444444' : '#bbbbbb', borderRadius: 6, padding: '8px 14px', cursor: priceLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
              {priceLoading ? '↻ Hænter…' : '↻ Opdater kurser'}
            </button>
            <button onClick={fetchAnalyse} disabled={analyseLoading} style={{ fontFamily: mono, fontSize: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', color: analyseLoading ? '#444444' : '#a5b4fc', borderRadius: 6, padding: '8px 14px', cursor: analyseLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}>
              {analyseLoading ? '🔍 Analyserer…' : '🔍 AI-analyse'}
            </button>
          </div>
        </div>
        {priceError && (
          <div style={{ fontFamily: mono, fontSize: 9, color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            {'⚠ Kurser ikke opdateret: ' + priceError}
          </div>
        )}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '22px 24px', marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: '#444444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Startkapital</div>
              <div style={{ fontFamily: mono, fontSize: 19, color: '#888888', fontWeight: 500 }}>{STARTKAPITAL.toLocaleString('da-DK')} kr</div>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: '#444444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{'Aktuel værdi'}</div>
              <div style={{ fontFamily: mono, fontSize: 19, color: '#e8e4da', fontWeight: 500 }}>{Math.round(aktuelVærdi).toLocaleString('da-DK')} kr</div>
              {!priceData && <div style={{ fontFamily: mono, fontSize: 7, color: '#333333', marginTop: 2 }}>{'baseret på købekurs'}</div>}
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: '#444444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Afkast</div>
              <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 500, color: afkastKr >= 0 ? '#22c55e' : '#ef4444' }}>
                {(afkastKr >= 0 ? '+' : '') + Math.round(afkastKr).toLocaleString('da-DK') + ' kr'}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: afkastPct >= 0 ? '#22c55e' : '#ef4444' }}>
                {(afkastPct >= 0 ? '+' : '') + afkastPct.toFixed(1) + '%'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: '#444444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Dage tilbage</div>
              <div style={{ fontFamily: mono, fontSize: 19, color: '#e8e4da', fontWeight: 500 }}>{dageTilbage}</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: '#333333' }}>til 31. dec 2026</div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 6 }}>
            <div style={{ height: '100%', width: progressPct + '%', background: 'rgba(255,255,255,0.14)', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 8, color: '#333333' }}>
            <span>17. mar</span><span>31. dec</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 22 }}>
          {POSITIONS.map(pos => {
            const price = getPrice(pos.ticker)
            const change = getChange(pos.ticker)
            const dp = price ?? pos.købekurs
            const posVal = pos.antalAktier * dp * USD_DKK
            const posAfkast = posVal - pos.investeret
            const posAfkastPct = (posAfkast / pos.investeret) * 100
            return (
              <div key={pos.ticker} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 3, background: pos.accentFarve }} />
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: mono, fontSize: 17, fontWeight: 600, color: '#e8e4da' }}>{pos.ticker}</span>
                      <span style={{ fontFamily: mono, fontSize: 8, color: '#444444' }}>{pos.børs}</span>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 7, background: pos.accentFarve + '18', border: '1px solid ' + pos.accentFarve + '33', borderRadius: 3, padding: '2px 6px', color: pos.accentFarve, letterSpacing: '0.03em', maxWidth: 130, textAlign: 'right', lineHeight: 1.4 }}>
                      {pos.tema}
                    </div>
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 13, color: '#555555', marginBottom: 12 }}>{pos.navn}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: '#e8e4da' }}>{'$' + dp.toFixed(2)}</span>
                    {change !== null && (
                      <span style={{ fontFamily: mono, fontSize: 10, color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                        {(change >= 0 ? '+' : '') + change.toFixed(2) + '%'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#333333', marginBottom: 2 }}>
                    {priceData?.lastUpdated ? 'Opdateret ' + priceData.lastUpdated : 'Købekurs (ikke opdateret)'}
                  </div>
                  <PriceRangeBar pos={pos} currentPrice={dp} />
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#444444', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span><span style={{ color: '#333333' }}>Antal: </span>{pos.antalAktier} stk</span>
                    <span><span style={{ color: '#333333' }}>Investeret: </span>{pos.investeret.toLocaleString('da-DK')} kr</span>
                    <span>
                      <span style={{ color: '#333333' }}>Afkast: </span>
                      <span style={{ color: posAfkast >= 0 ? '#22c55e' : '#ef4444' }}>
                        {(posAfkast >= 0 ? '+' : '') + posAfkastPct.toFixed(1) + '% (' + Math.round(posAfkast).toLocaleString('da-DK') + ' kr)'}
                      </span>
                    </span>
                  </div>
                </div>
                {pos.særregel && (
                  <div style={{ margin: '0 12px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 6, padding: '8px 10px', fontFamily: mono, fontSize: 8, color: '#f59e0b', lineHeight: 1.6 }}>
                    {'⚠ ' + pos.særregel}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 24px', marginBottom: 22 }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontStyle: 'italic', fontWeight: 400, color: '#e8e4da', margin: '0 0 14px' }}>Spillets regler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              '⏱ Slutdato: 31. december 2026 — sælg alt inden nytår',
              '📉 Stop-loss er hellig — alarm udløst = sælg inden 24 timer',
              '📅 Gennemgang: 31. marts · 30. juni · 30. september',
            ].map((rule, i) => (
              <div key={i} style={{ fontFamily: mono, fontSize: 10, color: '#666666', lineHeight: 1.5 }}>{rule}</div>
            ))}
          </div>
        </div>

        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '24px' }}>
          {!analyseData && !analyseLoading && !analyseError && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <button onClick={fetchAnalyse} style={{ fontFamily: mono, fontSize: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)', color: '#a5b4fc', borderRadius: 8, padding: '14px 30px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                🔍 Hent AI-analyse
              </button>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#333333', marginTop: 10 }}>
                Researcher seneste nyheder og giver signal per aktie
              </div>
            </div>
          )}
          {analyseLoading && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: mono, fontSize: 10, color: '#555555' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>↻</div>
              {'Researcher OXY… PLTR… CELC…'}
            </div>
          )}
          {analyseError && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#ef4444', marginBottom: 12 }}>
                {'⚠ ' + analyseError}
              </div>
              <button onClick={fetchAnalyse} style={{ fontFamily: mono, fontSize: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#777777', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
                {'Prøv igen'}
              </button>
            </div>
          )}
          {analyseData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <p style={{ fontFamily: serif, fontSize: 16, fontStyle: 'italic', color: '#999999', margin: 0, maxWidth: 600, lineHeight: 1.5 }}>{analyseData.porteføljeKommentar}</p>
                <span style={{ fontFamily: mono, fontSize: 8, color: '#333333', flexShrink: 0, marginLeft: 16 }}>{analyseData.analyseDato}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                {analyseData.analyser.map((a: AnalyseItem) => {
                  const pos = POSITIONS.find(p => p.ticker === a.ticker)
                  return (
                    <div key={a.ticker} style={{ background: '#0f1318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: pos?.accentFarve ?? '#e8e4da' }}>{a.ticker}</span>
                        <SignalBadge signal={a.signal} />
                      </div>
                      <p style={{ fontFamily: serif, fontSize: 13, fontStyle: 'italic', color: '#888888', margin: '0 0 10px', lineHeight: 1.55 }}>{a.begrundelse}</p>
                      {a.erstatning && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px' }}>
                          <div style={{ fontFamily: mono, fontSize: 8, color: '#444444', letterSpacing: '0.07em', marginBottom: 4 }}>
                            {'FORESLÅET ERSTATNING'}
                          </div>
                          <div style={{ fontFamily: mono, fontSize: 11, color: '#e8e4da', marginBottom: 4 }}>
                            {a.erstatning.ticker + ' — ' + a.erstatning.navn}
                          </div>
                          <p style={{ fontFamily: serif, fontSize: 12, fontStyle: 'italic', color: '#555555', margin: 0, lineHeight: 1.4 }}>{a.erstatning.begrundelse}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ textAlign: 'center' }}>
                <button onClick={fetchAnalyse} disabled={analyseLoading} style={{ fontFamily: mono, fontSize: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', color: '#8890c8', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  {'↻ Opdater analyse'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
