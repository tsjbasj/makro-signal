'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface StockPrice { ticker: string; price: number; change1d: number }
interface Portfolio { stocks: StockPrice[]; usdDkk: number; lastUpdated: string }
interface StockAnalysis { ticker: string; signal: string; signalColor: string; summary: string }
interface AnalysisResult { analyses: StockAnalysis[]; portfolioComment: string }
interface Trade { date: string; ticker: string; action: string; shares: number; price: number; dkk: number }

const POSITIONS = [
  { ticker: 'OXY',  name: 'Occidental Petroleum', shares: 31,  buy: 57.50,  stop: 46,  target: 68,  sellLow: 35,  sellHigh: 75,  dkk: 11769.03 },
  { ticker: 'PLTR', name: 'Palantir Technologies',  shares: 9,   buy: 152.30, stop: 110, target: 200, sellLow: 91,  sellHigh: 230, dkk: 8947.13  },
  { ticker: 'CELC', name: 'Celcuity',               shares: 12,  buy: 115.00, stop: 80,  target: 180, sellLow: 68,  sellHigh: 220, dkk: 9171.81  },
]

type PosEntry = {
  ticker: string; name: string; shares: number; buy: number
  stop: number; target: number; sellLow: number; sellHigh: number; dkk: number
}

const POS_KEY = 'pos2026run'

const INITIAL_TRADES: Trade[] = [
  { date: '17/03/2026', ticker: 'OXY',  action: 'KØB', shares: 31,  price: 57.50,  dkk: 11769.03 },
  { date: '17/03/2026', ticker: 'PLTR', action: 'KØB', shares: 9,   price: 152.30, dkk: 8947.13 },
  { date: '17/03/2026', ticker: 'CELC', action: 'KØB', shares: 12,  price: 115.00, dkk: 9171.81 },
]

const START_CAPITAL = 29887.97
const END_DATE   = new Date('2026-12-31')
const START_DATE = new Date('2026-03-17')

function fmt(n: number)  { return Math.round(n).toLocaleString('da-DK') + ' kr' }
function pct(n: number)  { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%' }
function daysTo(d: Date) { return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000)) }
function prog(s: Date, e: Date) {
  return Math.max(0, Math.min(100, (Date.now() - s.getTime()) / (e.getTime() - s.getTime()) * 100))
}

const SIG_COL: Record<string, string> = { yellow: '#f59e0b', green: '#22c55e', red: '#ef4444' }
const SIG_LBL: Record<string, string> = {
  'HOLD': 'HOLD', 'BUY MORE': 'KØB MERE', 'KOB MERE': 'KØB MERE',
  'SELL': 'SÆLG', 'SAELG': 'SÆLG',
}

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#f1f5f9', borderRadius: 6, padding: '6px 10px',
  fontFamily: 'var(--font-dm-mono)', fontSize: 11, width: '100%', outline: 'none',
}

function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(7,9,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ color: '#334155' }}>◈</span>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>Makro Signal</Link>
      <Link href="/portfolio" style={{ color: '#f1f5f9', textDecoration: 'none', borderBottom: '1px solid #6366f1', paddingBottom: 2 }}>The 2026 Run</Link>
    </nav>
  )
}

function Bar({ sellLow, stop, buy, target, sellHigh, current }: {
  sellLow: number; stop: number; buy: number; target: number; sellHigh: number; current: number | null
}) {
  const range   = sellHigh - sellLow
  const stopPct = (stop   - sellLow) / range * 100
  const buyPct  = (buy    - sellLow) / range * 100
  const tgtPct  = (target - sellLow) / range * 100
  const cPct    = current !== null ? Math.max(1, Math.min(99, (current - sellLow) / range * 100)) : null
  const up      = current !== null && current >= buy
  return (
    <div style={{ margin: '14px 0 4px' }}>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', left: 0, width: buyPct + '%', height: '100%', background: 'rgba(239,68,68,0.22)', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: buyPct + '%', right: 0, height: '100%', background: 'rgba(34,197,94,0.18)', borderRadius: '0 3px 3px 0' }} />
        <div style={{ position: 'absolute', left: 0, top: -5, width: 2, height: 16, background: '#ef4444', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: stopPct + '%', top: -4, width: 1.5, height: 14, background: '#f97316', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', left: buyPct + '%', top: -6, width: 2.5, height: 18, background: '#e2e8f0', transform: 'translateX(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: tgtPct + '%', top: -4, width: 1.5, height: 14, background: '#f97316', transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', right: 0, top: -5, width: 2, height: 16, background: '#ef4444', borderRadius: 1 }} />
        {cPct !== null && (
          <div style={{ position: 'absolute', top: '50%', left: cPct + '%', transform: 'translate(-50%,-50%)', width: 10, height: 10, background: up ? '#22c55e' : '#ef4444', borderRadius: '50%', border: '2px solid #07090f', boxShadow: '0 0 7px ' + (up ? '#22c55e' : '#ef4444') + '88', zIndex: 2 }} />
        )}
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const [data,   setData]   = useState<Portfolio | null>(null)
  const [analy,  setAnaly]  = useState<AnalysisResult | null>(null)
  const [loading, setLoad]  = useState(false)
  const [aLoad,  setALoad]  = useState(false)
  const [aTime,  setATime]  = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [config,   setConfig]   = useState<PosEntry[]>(POSITIONS.map(p => ({...p})))
  const [editBuf,  setEditBuf]  = useState<PosEntry[]>(POSITIONS.map(p => ({...p})))
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES)
  const [addTrade, setAdd]  = useState(false)
  const [newT, setNewT]     = useState({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
  const [err, setErr]       = useState<string | null>(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem('trades2026run')
      if (s) setTrades(JSON.parse(s))
    } catch { /* ignore */ }
    try {
      const s = localStorage.getItem(POS_KEY)
      if (s) { const p: PosEntry[] = JSON.parse(s); setConfig(p); setEditBuf(p) }
    } catch { /* ignore */ }
  }, [])

  const saveTrades = (t: Trade[]) => {
    setTrades(t)
    try { localStorage.setItem('trades2026run', JSON.stringify(t)) } catch { /* ignore */ }
  }

  const fetchPrices = useCallback(async () => {
    setLoad(true); setErr(null)
    try {
      const r = await fetch('/api/portfolio')
      const j = await r.json()
      if (j.error) throw new Error(j.error)
      setData(j)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setLoad(false) }
  }, [])

  const fetchAnalysis = async () => {
    setALoad(true)
    try {
      const r = await fetch('/api/analysis')
      const j = await r.json()
      if (j.error) throw new Error(j.error)
      setAnaly(j)
      setATime(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setALoad(false) }
  }

  useEffect(() => { fetchPrices() }, [fetchPrices])

  const rate    = data?.usdDkk ?? 6.90
  const totDKK  = data ? POSITIONS.reduce((s, p) => {
    const st = data.stocks.find(x => x.ticker === p.ticker)
    return s + (st ? st.price : p.buy) * p.shares * rate
  }, 0) : null
  const retDKK  = totDKK !== null ? totDKK - START_CAPITAL : null
  const retPct  = retDKK !== null ? retDKK / START_CAPITAL * 100 : null
  const progress = prog(START_DATE, END_DATE)
  const dLeft   = daysTo(END_DATE)

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 20, marginBottom: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090f', color: '#f1f5f9', fontFamily: 'var(--font-dm-mono)' }}>
      <Nav />
      {editOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false) }}
        >
          <div style={{ width: 500, maxWidth: '100%', height: '100vh', background: '#0d0f18', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: 28, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#64748b', letterSpacing: '0.12em' }}>⚙️ REDIGER POSITIONER</div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            {editBuf.map((pos, i) => (
              <div key={pos.ticker} style={{ marginBottom: 20, padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, color: '#e2e8f0', marginBottom: 14 }}>{pos.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {([ ['buy', 'K\u00F8bekurs ($)'], ['shares', 'Antal aktier'], ['stop', 'Tage stilling nedad ($)'], ['sellLow', 'S\u00E6lg altid nedad ($)'], ['target', 'Tage stilling opad ($)'], ['sellHigh', 'S\u00E6lg altid opad ($)'] ] as Array<[keyof PosEntry, string]>).map(([field, label]) => (
                    <div key={String(field)}>
                      <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
                      <input
                        type='number' step='0.01'
                        value={pos[field] as number}
                        onChange={e => {
                          const v = Number(e.target.value)
                          if (!isNaN(v)) setEditBuf(prev => prev.map((p, j) => j === i ? { ...p, [field]: v } as PosEntry : p))
                        }}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '7px 10px', color: '#e2e8f0', fontFamily: 'var(--font-dm-mono)', fontSize: 12, boxSizing: 'border-box' as const }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => { setConfig([...editBuf]); localStorage.setItem(POS_KEY, JSON.stringify(editBuf)); setEditOpen(false) }}
                style={{ flex: 1, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontFamily: 'var(--font-dm-mono)', fontSize: 11, padding: '11px 0', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.08em' }}
              >GEM ÆNDRINGER</button>
              <button
                onClick={() => { const r = POSITIONS.map(p => ({...p})); setEditBuf(r); setConfig(r); localStorage.removeItem(POS_KEY) }}
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontFamily: 'var(--font-dm-mono)', fontSize: 11, padding: '11px 0', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.08em' }}
              >NULSTIL TIL STANDARD</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em', marginBottom: 8 }}>◈ THE 2026 RUN</div>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 42, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.1 }}>
              Portefølje <em style={{ fontWeight: 400, color: '#94a3b8', fontSize: 34 }}>31. dec 2026</em>
            </h1>
            {data && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                {data.lastUpdated} · USD/DKK {rate.toFixed(2)}
              </div>
            )}
          </div>
          <button onClick={fetchPrices} disabled={loading} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: loading ? '#334155' : '#94a3b8', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
            {loading ? '↻ Henter…' : '↻ Opdater kurser'}
          </button>
          <button onClick={() => { setEditBuf(config.map(p => ({...p}))); setEditOpen(true) }} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.05em' }}>
            ⚙️ Rediger positioner
          </button>
        </div>

        {err && <div style={{ ...card, borderColor: '#ef4444', color: '#ef4444', fontSize: 12 }}>Fejl: {err}</div>}

        {/* Portfolio overview */}
        <div style={{ ...card, borderTop: '2px solid #6366f1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 6 }}>SAMLET VÆRDI</div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 600 }}>{totDKK ? fmt(totDKK) : '— kr'}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 6 }}>AFKAST</div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 600, color: retDKK === null ? '#f1f5f9' : retDKK >= 0 ? '#22c55e' : '#ef4444' }}>
                {retDKK !== null ? (retDKK >= 0 ? '+' : '') + fmt(Math.abs(retDKK)) : '—'}
              </div>
              {retPct !== null && <div style={{ fontSize: 11, color: retPct >= 0 ? '#22c55e' : '#ef4444', marginTop: 2 }}>{pct(retPct)}</div>}
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 6 }}>STARTKAPITAL</div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 600, color: '#94a3b8' }}>{fmt(START_CAPITAL)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 6 }}>DAGE TILBAGE</div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 600 }}>{dLeft}</div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginBottom: 4 }}>
              <span>17. mar 2026</span>
              <span style={{ color: '#6366f1' }}>{progress.toFixed(0)}% af perioden</span>
              <span>31. dec 2026</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 2 }} />
            </div>
          </div>
        </div>

        {/* Stock cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {config.map(pos => {
            const st     = data?.stocks.find(s => s.ticker === pos.ticker)
            const cur    = st?.price ?? null
            const retP   = cur !== null ? (cur - pos.buy) / pos.buy * 100 : null
            const retK   = cur !== null ? (cur - pos.buy) * pos.shares * rate : null
            const accent = retP === null ? '#6366f1' : retP >= 0 ? '#22c55e' : '#ef4444'
            return (
              <div key={pos.ticker} style={{ ...card, borderTop: '2px solid ' + accent, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, fontWeight: 600 }}>{pos.ticker}</div>
                  {st && (
                    <div style={{ fontSize: 10, color: st.change1d >= 0 ? '#22c55e' : '#ef4444', background: st.change1d >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {pct(st.change1d)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>{pos.name}</div>
                <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 30, fontWeight: 600, color: '#f1f5f9' }}>
                  {cur !== null ? '$' + cur.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{'Købt: $' + pos.buy + ' · ' + pos.shares + ' aktier'}</div>
                <Bar sellLow={pos.sellLow} stop={pos.stop} buy={pos.buy} target={pos.target} sellHigh={pos.sellHigh} current={cur} />
                                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'var(--font-dm-mono)', marginTop: 8, lineHeight: 1.8 }}>
                                  <div>{'\u2B07 Tage stilling: 
                {retP !== null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, fontWeight: 600, color: retP >= 0 ? '#22c55e' : '#ef4444' }}>{pct(retP)}</span>
                    {retK !== null && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>{(retK >= 0 ? '+' : '') + fmt(Math.abs(retK))}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI analysis */}
        <div style={{ ...card, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8b5cf6', letterSpacing: '0.1em' }}>AI-ANALYSE</div>
            <button onClick={fetchAnalysis} disabled={aLoad} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: aLoad ? '#6b7280' : '#a78bfa', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
              {aLoad ? 'Analyserer…' : '🔍 Hent AI-analyse'}
            </button>
          </div>
          {!analy && !aLoad && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              Klik for at hente AI-analyse baseret på aktuelle nyheder.
            </div>
          )}
          {analy && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {analy.analyses.map(a => (
                  <div key={a.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>{a.ticker}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: SIG_COL[a.signalColor] ?? '#f59e0b', background: (SIG_COL[a.signalColor] ?? '#f59e0b') + '22', padding: '2px 8px', borderRadius: 4 }}>
                        {SIG_LBL[a.signal] ?? a.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 6px', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{analy.portfolioComment}</p>
              {aTime && <div style={{ fontSize: 9, color: '#334155' }}>Analyse hentet kl. {aTime}</div>}
            </>
          )}
        </div>

        {/* Trade log */}
        <div style={{ ...card, borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>HANDELSLOG</div>
            <button onClick={() => setAdd(!addTrade)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--font-dm-mono)', fontSize: 10, cursor: 'pointer' }}>
              {addTrade ? 'Annuller' : '+ Tilføj handel'}
            </button>
          </div>
          {addTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
              <select value={newT.ticker} onChange={e => setNewT({ ...newT, ticker: e.target.value })} style={inp}>
                <option>OXY</option><option>PLTR</option><option>CELC</option>
              </select>
              <select value={newT.action} onChange={e => setNewT({ ...newT, action: e.target.value })} style={inp}>
                <option value="KØB">KØB</option><option value="SÆLG">SÆLG</option>
              </select>
              <input placeholder="Antal" type="number" value={newT.shares} onChange={e => setNewT({ ...newT, shares: e.target.value })} style={inp} />
              <input placeholder="Kurs $" type="number" value={newT.price} onChange={e => setNewT({ ...newT, price: e.target.value })} style={inp} />
              <input placeholder="Beløb DKK" type="number" value={newT.dkk} onChange={e => setNewT({ ...newT, dkk: e.target.value })} style={inp} />
              <button onClick={() => {
                if (!newT.shares || !newT.price) return
                const t: Trade = {
                  date: new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  ticker: newT.ticker, action: newT.action,
                  shares: Number(newT.shares), price: Number(newT.price),
                  dkk: Number(newT.dkk) || Math.round(Number(newT.shares) * Number(newT.price) * rate),
                }
                saveTrades([...trades, t])
                setNewT({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
                setAdd(false)
              }} style={{ ...inp, background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', width: 'auto', padding: '6px 14px' }}>
                Gem
              </button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Dato', 'Aktie', 'Handling', 'Antal', 'Kurs', 'Beløb (DKK)'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 400, letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>{t.date}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: 14 }}>{t.ticker}</td>
                  <td style={{ padding: '6px 8px', color: t.action === 'KØB' ? '#22c55e' : '#ef4444' }}>{t.action}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.shares}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{'$' + t.price.toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{Math.round(t.dkk).toLocaleString('da-DK') + ' kr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Next review */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 24 }}>
          Næste planlagte gennemgang: <span style={{ color: '#94a3b8' }}>31. marts 2026</span>
          {' — '}{daysTo(new Date('2026-03-31'))} dage
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
          DATA VIA ANTHROPIC API · KUN TIL INFORMATIONSFORMÅL · IKKE FINANSIEL RÅDGIVNING
        </div>

      </div>
    </div>
  )
}
 + pos.stop + '  \u00B7  S\u00E6lg altid: 
                {retP !== null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, fontWeight: 600, color: retP >= 0 ? '#22c55e' : '#ef4444' }}>{pct(retP)}</span>
                    {retK !== null && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>{(retK >= 0 ? '+' : '') + fmt(Math.abs(retK))}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI analysis */}
        <div style={{ ...card, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8b5cf6', letterSpacing: '0.1em' }}>AI-ANALYSE</div>
            <button onClick={fetchAnalysis} disabled={aLoad} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: aLoad ? '#6b7280' : '#a78bfa', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
              {aLoad ? 'Analyserer…' : '🔍 Hent AI-analyse'}
            </button>
          </div>
          {!analy && !aLoad && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              Klik for at hente AI-analyse baseret på aktuelle nyheder.
            </div>
          )}
          {analy && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {analy.analyses.map(a => (
                  <div key={a.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>{a.ticker}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: SIG_COL[a.signalColor] ?? '#f59e0b', background: (SIG_COL[a.signalColor] ?? '#f59e0b') + '22', padding: '2px 8px', borderRadius: 4 }}>
                        {SIG_LBL[a.signal] ?? a.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 6px', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{analy.portfolioComment}</p>
              {aTime && <div style={{ fontSize: 9, color: '#334155' }}>Analyse hentet kl. {aTime}</div>}
            </>
          )}
        </div>

        {/* Trade log */}
        <div style={{ ...card, borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>HANDELSLOG</div>
            <button onClick={() => setAdd(!addTrade)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--font-dm-mono)', fontSize: 10, cursor: 'pointer' }}>
              {addTrade ? 'Annuller' : '+ Tilføj handel'}
            </button>
          </div>
          {addTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
              <select value={newT.ticker} onChange={e => setNewT({ ...newT, ticker: e.target.value })} style={inp}>
                <option>OXY</option><option>PLTR</option><option>CELC</option>
              </select>
              <select value={newT.action} onChange={e => setNewT({ ...newT, action: e.target.value })} style={inp}>
                <option value="KØB">KØB</option><option value="SÆLG">SÆLG</option>
              </select>
              <input placeholder="Antal" type="number" value={newT.shares} onChange={e => setNewT({ ...newT, shares: e.target.value })} style={inp} />
              <input placeholder="Kurs $" type="number" value={newT.price} onChange={e => setNewT({ ...newT, price: e.target.value })} style={inp} />
              <input placeholder="Beløb DKK" type="number" value={newT.dkk} onChange={e => setNewT({ ...newT, dkk: e.target.value })} style={inp} />
              <button onClick={() => {
                if (!newT.shares || !newT.price) return
                const t: Trade = {
                  date: new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  ticker: newT.ticker, action: newT.action,
                  shares: Number(newT.shares), price: Number(newT.price),
                  dkk: Number(newT.dkk) || Math.round(Number(newT.shares) * Number(newT.price) * rate),
                }
                saveTrades([...trades, t])
                setNewT({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
                setAdd(false)
              }} style={{ ...inp, background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', width: 'auto', padding: '6px 14px' }}>
                Gem
              </button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Dato', 'Aktie', 'Handling', 'Antal', 'Kurs', 'Beløb (DKK)'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 400, letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>{t.date}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: 14 }}>{t.ticker}</td>
                  <td style={{ padding: '6px 8px', color: t.action === 'KØB' ? '#22c55e' : '#ef4444' }}>{t.action}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.shares}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{'$' + t.price.toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{Math.round(t.dkk).toLocaleString('da-DK') + ' kr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Next review */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 24 }}>
          Næste planlagte gennemgang: <span style={{ color: '#94a3b8' }}>31. marts 2026</span>
          {' — '}{daysTo(new Date('2026-03-31'))} dage
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
          DATA VIA ANTHROPIC API · KUN TIL INFORMATIONSFORMÅL · IKKE FINANSIEL RÅDGIVNING
        </div>

      </div>
    </div>
  )
}
 + pos.sellLow}</div>
                                  <div>{'\u2B06 Tage stilling: 
                {retP !== null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, fontWeight: 600, color: retP >= 0 ? '#22c55e' : '#ef4444' }}>{pct(retP)}</span>
                    {retK !== null && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>{(retK >= 0 ? '+' : '') + fmt(Math.abs(retK))}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI analysis */}
        <div style={{ ...card, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8b5cf6', letterSpacing: '0.1em' }}>AI-ANALYSE</div>
            <button onClick={fetchAnalysis} disabled={aLoad} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: aLoad ? '#6b7280' : '#a78bfa', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
              {aLoad ? 'Analyserer…' : '🔍 Hent AI-analyse'}
            </button>
          </div>
          {!analy && !aLoad && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              Klik for at hente AI-analyse baseret på aktuelle nyheder.
            </div>
          )}
          {analy && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {analy.analyses.map(a => (
                  <div key={a.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>{a.ticker}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: SIG_COL[a.signalColor] ?? '#f59e0b', background: (SIG_COL[a.signalColor] ?? '#f59e0b') + '22', padding: '2px 8px', borderRadius: 4 }}>
                        {SIG_LBL[a.signal] ?? a.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 6px', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{analy.portfolioComment}</p>
              {aTime && <div style={{ fontSize: 9, color: '#334155' }}>Analyse hentet kl. {aTime}</div>}
            </>
          )}
        </div>

        {/* Trade log */}
        <div style={{ ...card, borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>HANDELSLOG</div>
            <button onClick={() => setAdd(!addTrade)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--font-dm-mono)', fontSize: 10, cursor: 'pointer' }}>
              {addTrade ? 'Annuller' : '+ Tilføj handel'}
            </button>
          </div>
          {addTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
              <select value={newT.ticker} onChange={e => setNewT({ ...newT, ticker: e.target.value })} style={inp}>
                <option>OXY</option><option>PLTR</option><option>CELC</option>
              </select>
              <select value={newT.action} onChange={e => setNewT({ ...newT, action: e.target.value })} style={inp}>
                <option value="KØB">KØB</option><option value="SÆLG">SÆLG</option>
              </select>
              <input placeholder="Antal" type="number" value={newT.shares} onChange={e => setNewT({ ...newT, shares: e.target.value })} style={inp} />
              <input placeholder="Kurs $" type="number" value={newT.price} onChange={e => setNewT({ ...newT, price: e.target.value })} style={inp} />
              <input placeholder="Beløb DKK" type="number" value={newT.dkk} onChange={e => setNewT({ ...newT, dkk: e.target.value })} style={inp} />
              <button onClick={() => {
                if (!newT.shares || !newT.price) return
                const t: Trade = {
                  date: new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  ticker: newT.ticker, action: newT.action,
                  shares: Number(newT.shares), price: Number(newT.price),
                  dkk: Number(newT.dkk) || Math.round(Number(newT.shares) * Number(newT.price) * rate),
                }
                saveTrades([...trades, t])
                setNewT({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
                setAdd(false)
              }} style={{ ...inp, background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', width: 'auto', padding: '6px 14px' }}>
                Gem
              </button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Dato', 'Aktie', 'Handling', 'Antal', 'Kurs', 'Beløb (DKK)'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 400, letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>{t.date}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: 14 }}>{t.ticker}</td>
                  <td style={{ padding: '6px 8px', color: t.action === 'KØB' ? '#22c55e' : '#ef4444' }}>{t.action}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.shares}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{'$' + t.price.toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{Math.round(t.dkk).toLocaleString('da-DK') + ' kr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Next review */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 24 }}>
          Næste planlagte gennemgang: <span style={{ color: '#94a3b8' }}>31. marts 2026</span>
          {' — '}{daysTo(new Date('2026-03-31'))} dage
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
          DATA VIA ANTHROPIC API · KUN TIL INFORMATIONSFORMÅL · IKKE FINANSIEL RÅDGIVNING
        </div>

      </div>
    </div>
  )
}
 + pos.target + '  \u00B7  S\u00E6lg altid: 
                {retP !== null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, fontWeight: 600, color: retP >= 0 ? '#22c55e' : '#ef4444' }}>{pct(retP)}</span>
                    {retK !== null && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>{(retK >= 0 ? '+' : '') + fmt(Math.abs(retK))}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI analysis */}
        <div style={{ ...card, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8b5cf6', letterSpacing: '0.1em' }}>AI-ANALYSE</div>
            <button onClick={fetchAnalysis} disabled={aLoad} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: aLoad ? '#6b7280' : '#a78bfa', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
              {aLoad ? 'Analyserer…' : '🔍 Hent AI-analyse'}
            </button>
          </div>
          {!analy && !aLoad && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              Klik for at hente AI-analyse baseret på aktuelle nyheder.
            </div>
          )}
          {analy && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {analy.analyses.map(a => (
                  <div key={a.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>{a.ticker}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: SIG_COL[a.signalColor] ?? '#f59e0b', background: (SIG_COL[a.signalColor] ?? '#f59e0b') + '22', padding: '2px 8px', borderRadius: 4 }}>
                        {SIG_LBL[a.signal] ?? a.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 6px', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{analy.portfolioComment}</p>
              {aTime && <div style={{ fontSize: 9, color: '#334155' }}>Analyse hentet kl. {aTime}</div>}
            </>
          )}
        </div>

        {/* Trade log */}
        <div style={{ ...card, borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>HANDELSLOG</div>
            <button onClick={() => setAdd(!addTrade)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--font-dm-mono)', fontSize: 10, cursor: 'pointer' }}>
              {addTrade ? 'Annuller' : '+ Tilføj handel'}
            </button>
          </div>
          {addTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
              <select value={newT.ticker} onChange={e => setNewT({ ...newT, ticker: e.target.value })} style={inp}>
                <option>OXY</option><option>PLTR</option><option>CELC</option>
              </select>
              <select value={newT.action} onChange={e => setNewT({ ...newT, action: e.target.value })} style={inp}>
                <option value="KØB">KØB</option><option value="SÆLG">SÆLG</option>
              </select>
              <input placeholder="Antal" type="number" value={newT.shares} onChange={e => setNewT({ ...newT, shares: e.target.value })} style={inp} />
              <input placeholder="Kurs $" type="number" value={newT.price} onChange={e => setNewT({ ...newT, price: e.target.value })} style={inp} />
              <input placeholder="Beløb DKK" type="number" value={newT.dkk} onChange={e => setNewT({ ...newT, dkk: e.target.value })} style={inp} />
              <button onClick={() => {
                if (!newT.shares || !newT.price) return
                const t: Trade = {
                  date: new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  ticker: newT.ticker, action: newT.action,
                  shares: Number(newT.shares), price: Number(newT.price),
                  dkk: Number(newT.dkk) || Math.round(Number(newT.shares) * Number(newT.price) * rate),
                }
                saveTrades([...trades, t])
                setNewT({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
                setAdd(false)
              }} style={{ ...inp, background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', width: 'auto', padding: '6px 14px' }}>
                Gem
              </button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Dato', 'Aktie', 'Handling', 'Antal', 'Kurs', 'Beløb (DKK)'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 400, letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>{t.date}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: 14 }}>{t.ticker}</td>
                  <td style={{ padding: '6px 8px', color: t.action === 'KØB' ? '#22c55e' : '#ef4444' }}>{t.action}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.shares}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{'$' + t.price.toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{Math.round(t.dkk).toLocaleString('da-DK') + ' kr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Next review */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 24 }}>
          Næste planlagte gennemgang: <span style={{ color: '#94a3b8' }}>31. marts 2026</span>
          {' — '}{daysTo(new Date('2026-03-31'))} dage
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
          DATA VIA ANTHROPIC API · KUN TIL INFORMATIONSFORMÅL · IKKE FINANSIEL RÅDGIVNING
        </div>

      </div>
    </div>
  )
}
 + pos.sellHigh}</div>
                                </div>
                                {pos.ticker === 'CELC' && (
                                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: '#fca5a5', fontFamily: 'var(--font-dm-mono)' }}>{'\uD83D\uDCC5 FDA-beslutning: 17. juli 2026 \u2014 s\u00E6lg dagen efter uanset kurs'}</div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-dm-mono)', marginTop: 4 }}>{Math.max(0, Math.ceil((new Date('2026-07-17').getTime() - Date.now()) / 86_400_000)) + ' dage til beslutning'}</div>
                                  </div>
                                )}
                {retP !== null && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, fontWeight: 600, color: retP >= 0 ? '#22c55e' : '#ef4444' }}>{pct(retP)}</span>
                    {retK !== null && <span style={{ fontSize: 9, color: '#475569', marginLeft: 8 }}>{(retK >= 0 ? '+' : '') + fmt(Math.abs(retK))}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI analysis */}
        <div style={{ ...card, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#8b5cf6', letterSpacing: '0.1em' }}>AI-ANALYSE</div>
            <button onClick={fetchAnalysis} disabled={aLoad} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: aLoad ? '#6b7280' : '#a78bfa', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
              {aLoad ? 'Analyserer…' : '🔍 Hent AI-analyse'}
            </button>
          </div>
          {!analy && !aLoad && (
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              Klik for at hente AI-analyse baseret på aktuelle nyheder.
            </div>
          )}
          {analy && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {analy.analyses.map(a => (
                  <div key={a.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>{a.ticker}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: SIG_COL[a.signalColor] ?? '#f59e0b', background: (SIG_COL[a.signalColor] ?? '#f59e0b') + '22', padding: '2px 8px', borderRadius: 4 }}>
                        {SIG_LBL[a.signal] ?? a.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 6px', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>{analy.portfolioComment}</p>
              {aTime && <div style={{ fontSize: 9, color: '#334155' }}>Analyse hentet kl. {aTime}</div>}
            </>
          )}
        </div>

        {/* Trade log */}
        <div style={{ ...card, borderTop: '2px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>HANDELSLOG</div>
            <button onClick={() => setAdd(!addTrade)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 6, padding: '4px 12px', fontFamily: 'var(--font-dm-mono)', fontSize: 10, cursor: 'pointer' }}>
              {addTrade ? 'Annuller' : '+ Tilføj handel'}
            </button>
          </div>
          {addTrade && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
              <select value={newT.ticker} onChange={e => setNewT({ ...newT, ticker: e.target.value })} style={inp}>
                <option>OXY</option><option>PLTR</option><option>CELC</option>
              </select>
              <select value={newT.action} onChange={e => setNewT({ ...newT, action: e.target.value })} style={inp}>
                <option value="KØB">KØB</option><option value="SÆLG">SÆLG</option>
              </select>
              <input placeholder="Antal" type="number" value={newT.shares} onChange={e => setNewT({ ...newT, shares: e.target.value })} style={inp} />
              <input placeholder="Kurs $" type="number" value={newT.price} onChange={e => setNewT({ ...newT, price: e.target.value })} style={inp} />
              <input placeholder="Beløb DKK" type="number" value={newT.dkk} onChange={e => setNewT({ ...newT, dkk: e.target.value })} style={inp} />
              <button onClick={() => {
                if (!newT.shares || !newT.price) return
                const t: Trade = {
                  date: new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                  ticker: newT.ticker, action: newT.action,
                  shares: Number(newT.shares), price: Number(newT.price),
                  dkk: Number(newT.dkk) || Math.round(Number(newT.shares) * Number(newT.price) * rate),
                }
                saveTrades([...trades, t])
                setNewT({ ticker: 'OXY', action: 'KØB', shares: '', price: '', dkk: '' })
                setAdd(false)
              }} style={{ ...inp, background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', width: 'auto', padding: '6px 14px' }}>
                Gem
              </button>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Dato', 'Aktie', 'Handling', 'Antal', 'Kurs', 'Beløb (DKK)'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontSize: 9, color: '#475569', fontWeight: 400, letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>{t.date}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--font-cormorant)', fontWeight: 600, fontSize: 14 }}>{t.ticker}</td>
                  <td style={{ padding: '6px 8px', color: t.action === 'KØB' ? '#22c55e' : '#ef4444' }}>{t.action}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.shares}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{'$' + t.price.toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{Math.round(t.dkk).toLocaleString('da-DK') + ' kr'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Next review */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 24 }}>
          Næste planlagte gennemgang: <span style={{ color: '#94a3b8' }}>31. marts 2026</span>
          {' — '}{daysTo(new Date('2026-03-31'))} dage
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
          DATA VIA ANTHROPIC API · KUN TIL INFORMATIONSFORMÅL · IKKE FINANSIEL RÅDGIVNING
        </div>

      </div>
    </div>
  )
}
