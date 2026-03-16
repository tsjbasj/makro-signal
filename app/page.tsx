'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   TYPES
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

interface MarketData {
  fearGreedIndex: number
  fearGreedLabel: string
  sp500Price:    number
  sp500_52wHigh: number
  sahmRule:      number
  updatedAt:     string
}

interface ScoreResult {
  score:       number
  pts:         { sp: number; fg: number; ism: number; sahm: number }
  drawdownPct: number
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SCORE LOGIC
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function computeScore(data: MarketData | null, ism: number | null): ScoreResult {
  if (!data) return { score: 0, pts: { sp: 0, fg: 0, ism: 0, sahm: 0 }, drawdownPct: 0 }

  const ddPct =
    data.sp500_52wHigh > 0
      ? Math.max(0, (data.sp500_52wHigh - data.sp500Price) / data.sp500_52wHigh)
      : 0

  let score = 0
  const pts = { sp: 0, fg: 0, ism: 0, sahm: 0 }

  if (ddPct >= 0.15) { score += 2; pts.sp += 2 }
  if (ddPct >= 0.25) { score += 2; pts.sp += 2 }
  if (data.fearGreedIndex <= 35) { score += 1; pts.fg += 1 }
  if (data.fearGreedIndex <= 20) { score += 1; pts.fg += 1 }
  if (ism !== null && ism <= 49) { score += 1; pts.ism += 1 }
  if (ism !== null && ism <= 47) { score += 1; pts.ism += 1 }
  if (data.sahmRule >= 0.5) { score += 2; pts.sahm += 2 }

  return { score, pts, drawdownPct: ddPct }
}

function getSignal(score: number) {
  if (score >= 7) return { label: 'STORT KÃB',  amount: '25.000 kr', emoji: 'ð¢', color: '#22c55e' }
  if (score >= 4) return { label: 'MEDIUM KÃB', amount: '12.500 kr', emoji: 'ð¡', color: '#f59e0b' }
  if (score === 3) return { label: 'LILLE KÃB',  amount: '6.250 kr',  emoji: 'ð ', color: '#f97316' }
  return             { label: 'AFVENT',      amount: 'â',          emoji: 'ð´', color: '#ef4444' }
}

function getGapLines(data: MarketData | null, ism: number | null, ddPct: number): string[] {
  if (!data) return ['Afventer dataâ¦']
  const lines: string[] = []
  const sp   = data.sp500Price
  const high = data.sp500_52wHigh
  const dd   = ddPct * 100

  // S&P
  if (dd < 15) {
    const target = Math.round(high * 0.85)
    const pct    = ((sp - target) / sp * 100).toFixed(1)
    lines.push(`S&P 500 skal falde ${pct}% mere (til ${target.toLocaleString('da-DK')}) for de fÃ¸rste +2 point.`)
  } else if (dd < 25) {
    const target = Math.round(high * 0.75)
    const pct    = ((sp - target) / sp * 100).toFixed(1)
    lines.push(`S&P 500 har faldet ${dd.toFixed(1)}% (+2 point). Skal falde ${pct}% mere (til ${target.toLocaleString('da-DK')}) for +2 point til.`)
  } else {
    lines.push(`S&P 500 har faldet ${dd.toFixed(1)}% â maks S&P point opnÃ¥et (+4).`)
  }

  // F&G
  const fg = data.fearGreedIndex
  if (fg > 35)      lines.push(`Fear & Greed pÃ¥ ${fg} â skal under 35 for +1 point.`)
  else if (fg > 20) lines.push(`Fear & Greed pÃ¥ ${fg} (+1 point). Skal under 20 for +1 point til.`)
  else              lines.push(`Fear & Greed pÃ¥ ${fg} â maks F&G point opnÃ¥et (+2).`)

  // ISM
  if (ism === null)    lines.push('ISM PMI ikke indlÃ¦st â indtast det seneste tal nedenfor.')
  else if (ism >= 49)  lines.push(`ISM PMI pÃ¥ ${ism.toFixed(1)} â skal under 49 for +1 point.`)
  else if (ism >= 47)  lines.push(`ISM PMI pÃ¥ ${ism.toFixed(1)} (+1 point). Skal under 47 for +1 point til.`)
  else                 lines.push(`ISM PMI pÃ¥ ${ism.toFixed(1)} â maks ISM point opnÃ¥et (+2).`)

  // Sahm
  const s = data.sahmRule
  if (s < 0.5) lines.push(`Sahm-reglen pÃ¥ ${s.toFixed(2)} â skal op pÃ¥ 0,50 for +2 point.`)
  else         lines.push(`Sahm-reglen pÃ¥ ${s.toFixed(2)} â over grÃ¦nsen, +2 point aktiveret.`)

  return lines
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SVG GAUGE
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function FGGauge({ value }: { value: number | null }) {
  const v   = value ?? 50
  const deg = 180 - (v / 100) * 180
  const rad = deg * (Math.PI / 180)
  const r   = 70
  const nx  = (100 + r * Math.cos(rad)).toFixed(1)
  const ny  = (100 - r * Math.sin(rad)).toFixed(1)

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 200 112" style={{ width: '100%', maxWidth: 180 }}>
        <defs>
          <linearGradient id="fg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ef4444" />
            <stop offset="25%"  stopColor="#f59e0b" />
            <stop offset="50%"  stopColor="#eab308" />
            <stop offset="75%"  stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 18 100 A 82 82 0 0 1 182 100" stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M 18 100 A 82 82 0 0 1 182 100" stroke="url(#fg-grad)" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.9" />
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {value !== null && (
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 42, fontWeight: 600, color: '#f1f5f9', lineHeight: 1, marginTop: -4 }}>
          {Math.round(value)}
        </div>
      )}
    </div>
  )
}
function SahmBar({ value }: { value: number | null }) {
  const v    = value ?? 0
  const pct  = Math.min(100, (v / 1.5) * 100)
  const color = v >= 0.5 ? '#ef4444' : v >= 0.3 ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
        {/* threshold at 0.5 = 33.3% */}
        <div style={{ position: 'absolute', top: -5, bottom: -5, left: '33.3%', width: 2, background: '#f59e0b', borderRadius: 1 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginTop: 4 }}>
        <span>0,0</span><span>0,5</span><span>1,5</span>
      </div>
    </div>
  )
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   CARD WRAPPER
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

const ACCENT: Record<string, string> = {
  purple: '#6366f1',
  green:  '#22c55e',
  orange: '#f59e0b',
  red:    '#ef4444',
}

function Card({ children, accent = 'purple', className = '', style }: {
  children: React.ReactNode
  accent?: string
  className?: string
  style?: React.CSSProperties
}) {
  const color = ACCENT[accent] ?? accent
  return (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '22px 20px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      {children}
    </div>
  )
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   HELPERS
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

const CACHE_KEY    = 'mks2_data'
const ISM_KEY      = 'mks2_ism'
const COOLDOWN_KEY = 'mks2_last_buy'
const CACHE_TTL    = 3_600_000

function getCached(): MarketData | null {
  try {
    const r = localStorage.getItem(CACHE_KEY)
    if (!r) return null
    const o = JSON.parse(r)
    if (Date.now() - o.ts > CACHE_TTL) return null
    return o.data
  } catch { return null }
}

function setCached(data: MarketData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) +
    ' kl. ' + new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   PAGE
âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

export default function Page() {
  const [data,    setData]    = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [ism,     setIsm]     = useState<number | null>(null)
  const [ismInput,setIsmInput]= useState('')
  const [lastBuy, setLastBuy] = useState<string | null>(null)
  const ismRef = useRef<HTMLInputElement>(null)

  // Load ISM + cooldown from localStorage
  useEffect(() => {
    try {
      const r = localStorage.getItem(ISM_KEY)
      if (r) { const o = JSON.parse(r); setIsm(o.value) }
    } catch {}
    try {
      const r = localStorage.getItem(COOLDOWN_KEY)
      if (r) setLastBuy(r)
    } catch {}
  }, [])

  // Fetch market data
  const fetchData = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    if (!force) {
      const cached = getCached()
      if (cached) { setData(cached); setLoading(false); return }
    }
    try {
      const res  = await fetch('/api/data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setCached(json)
      setData(json)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      // Try stale cache
      try {
        const r = localStorage.getItem(CACHE_KEY)
        if (r) { const o = JSON.parse(r); setData(o.data) }
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function saveIsm() {
    const v = parseFloat(ismInput)
    if (isNaN(v) || v < 20 || v > 75) {
      if (ismRef.current) ismRef.current.style.borderColor = '#ef4444'
      setTimeout(() => { if (ismRef.current) ismRef.current.style.borderColor = '' }, 1200)
      return
    }
    localStorage.setItem(ISM_KEY, JSON.stringify({ value: v, savedAt: new Date().toISOString() }))
    setIsm(v)
    setIsmInput('')
  }

  function registerBuy() {
    if (!confirm(`RegistrÃ©r kÃ¸b i dag (${new Date().toLocaleDateString('da-DK')})?`)) return
    const d = new Date().toISOString()
    localStorage.setItem(COOLDOWN_KEY, d)
    setLastBuy(d)
  }

  // Score
  const { score, pts, drawdownPct } = computeScore(data, ism)
  const signal   = getSignal(score)
  const gapLines = getGapLines(data, ism, drawdownPct)

  // Cooldown info
  const cooldownInfo = (() => {
    if (!lastBuy) return null
    const last    = new Date(lastBuy)
    const elapsed = (Date.now() - last.getTime()) / 86_400_000
    const days    = Math.ceil(elapsed)
    const within  = days <= 90
    return { last, days, within }
  })()

  // S&P drawdown display
  const ddPctDisplay = (drawdownPct * 100).toFixed(1)

  // accent color for signal panel
  const signalAccent = score >= 7 ? 'green' : score >= 4 ? 'orange' : score >= 3 ? 'orange' : 'red'

  // ISM saved date
  const ismSavedDate = (() => {
    try {
      const r = localStorage.getItem(ISM_KEY)
      if (!r) return null
      const o = JSON.parse(r)
      return new Date(o.savedAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
    } catch { return null }
  })()

  return (
    <main style={{ minHeight: '100vh', padding: '0 0 40px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>

        {/* ââ HEADER ââ */}
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 10 }}>
                â MARKEDSBAROMETER
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 'clamp(2rem,6vw,3rem)', fontWeight: 600, lineHeight: 1, color: '#f1f5f9' }}>
                US Marked{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 400 }}>KÃ¸bsstrategi</em>
              </h1>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              style={{
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc',
                fontFamily: 'var(--font-dm-mono)',
                fontSize: 12,
                padding: '8px 16px',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Henterâ¦' : 'â» Opdater data'}
            </button>
          </div>

          {/* Status bar */}
          <div style={{ marginTop: 12, fontSize: 11, color: '#475569', fontFamily: 'var(--font-dm-mono)' }}>
            {loading && <span>â Henter live dataâ¦</span>}
            {!loading && error && <span style={{ color: '#ef4444' }}>â Fejl: {error}</span>}
            {!loading && !error && data && (
              <span style={{ color: '#4ade80' }}>â Live data Â· opdateret {fmtDate(data.updatedAt)}</span>
            )}
          </div>
        </header>

        {/* ââ SIGNAL PANEL ââ */}
        <Card accent={signalAccent} className="" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 20 }}>
            {/* Top row: emoji + score + recommendation */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 36 }}>{signal.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
                    ANBEFALING
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 28, fontWeight: 600, color: signal.color, lineHeight: 1 }}>
                    {signal.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                    {signal.amount !== 'â' ? signal.amount : 'Afvent bedre indgang'}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
                  SCORE
                </div>
                <div style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 52, fontWeight: 600, lineHeight: 1, color: '#f1f5f9' }}>
                  {data ? score : 'â'}
                  <span style={{ fontSize: 20, color: '#475569' }}> / 8</span>
                </div>
              </div>
            </div>

                        {/* ── SCORE PROGRESS TRACK ── */}
            {data && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ position: 'relative', height: 8, display: 'flex', borderRadius: 4, overflow: 'visible', marginBottom: 8 }}>
                  <div style={{ flex: 2, height: '100%', background: score <= 2 ? '#475569' : 'rgba(71,85,105,0.25)', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ flex: 1, height: '100%', background: score === 3 ? '#22c55e' : score > 3 ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)' }} />
                  <div style={{ flex: 3, height: '100%', background: score >= 4 && score <= 6 ? '#f59e0b' : score > 6 ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)' }} />
                  <div style={{ flex: 2, height: '100%', background: score >= 7 ? '#ef4444' : 'rgba(239,68,68,0.15)', borderRadius: '0 4px 4px 0' }} />
                  <div style={{ position: 'absolute', top: '50%', left: `calc(${Math.min(97,(score/8)*100)}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, background: signal.color, borderRadius: '50%', border: '2px solid #07090f', boxShadow: `0 0 10px ${signal.color}99`, zIndex: 2 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 2fr', fontSize: 9, fontFamily: 'var(--font-dm-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>
                  <span>Afvent<br/><span style={{color:'#334155'}}>0–2</span></span>
                  <span style={{textAlign:'center'}}>6.250 kr<br/><span style={{color:'#334155'}}>3</span></span>
                  <span style={{textAlign:'center'}}>12.500 kr<br/><span style={{color:'#334155'}}>4–6</span></span>
                  <span style={{textAlign:'right'}}>25.000 kr<br/><span style={{color:'#334155'}}>7–8</span></span>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-dm-mono)', lineHeight: 1.5 }}>
                  {score >= 7
                    ? '✓ Maks niveau — STORT KØB signal aktivt'
                    : score >= 4
                      ? `${7 - score} point til STORT KØB (25.000 kr) — ${gapLines[0]}`
                      : score === 3
                        ? `1 point til MEDIUM KØB (12.500 kr) — ${gapLines[0]}`
                        : `${3 - score} point til LILLE KØB (6.250 kr) — ${gapLines[0]}`}
                </div>
              </div>
            )}
{/* Score table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
              <thead>
                <tr>
                  {['Indikator', 'Aktuel vÃ¦rdi', 'Trigger-niveauer', 'Point'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Point' ? 'right' : 'left', padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#475569', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-dm-mono)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* S&P 500 */}
                <tr style={{ background: pts.sp > 0 ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11 }}>S&amp;P 500</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f1f5f9', fontFamily: 'var(--font-cormorant), serif', fontSize: 16 }}>
                    {data ? (drawdownPct >= 0.001 ? `â${ddPctDisplay}% fra high` : 'NÃ¦r all-time high') : 'â'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: 10 }}>
                    â¥â15%: +2 &nbsp;Â·&nbsp; â¥â25%: +4
                  </td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: pts.sp > 0 ? '#4ade80' : '#334155', fontWeight: 600 }}>
                    {data ? (pts.sp > 0 ? `+${pts.sp}` : '0') : 'â'}
                  </td>
                </tr>
                {/* Fear & Greed */}
                <tr style={{ background: pts.fg > 0 ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11 }}>Fear &amp; Greed</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f1f5f9', fontFamily: 'var(--font-cormorant), serif', fontSize: 16 }}>
                    {data ? `${data.fearGreedIndex} Â· ${data.fearGreedLabel}` : 'â'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: 10 }}>
                    â¤35: +1 &nbsp;Â·&nbsp; â¤20: +2
                  </td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: pts.fg > 0 ? '#4ade80' : '#334155', fontWeight: 600 }}>
                    {data ? (pts.fg > 0 ? `+${pts.fg}` : '0') : 'â'}
                  </td>
                </tr>
                {/* ISM PMI */}
                <tr style={{ background: pts.ism > 0 ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 11 }}>ISM PMI</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: ism !== null ? '#f1f5f9' : '#475569', fontFamily: 'var(--font-cormorant), serif', fontSize: 16 }}>
                    {ism !== null ? ism.toFixed(1) : 'â  ikke indlÃ¦st'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: 10 }}>
                    â¤49: +1 &nbsp;Â·&nbsp; â¤47: +2
                  </td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: pts.ism > 0 ? '#4ade80' : '#334155', fontWeight: 600 }}>
                    {pts.ism > 0 ? `+${pts.ism}` : '0'}
                  </td>
                </tr>
                {/* Sahm */}
                <tr style={{ background: pts.sahm > 0 ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ padding: '10px 0', color: '#94a3b8', fontSize: 11 }}>Sahm-regel</td>
                  <td style={{ padding: '10px 12px', color: '#f1f5f9', fontFamily: 'var(--font-cormorant), serif', fontSize: 16 }}>
                    {data ? data.sahmRule.toFixed(2).replace('.', ',') : 'â'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 10 }}>
                    â¥0,50: +2
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: pts.sahm > 0 ? '#4ade80' : '#334155', fontWeight: 600 }}>
                    {data ? (pts.sahm > 0 ? `+${pts.sahm}` : '0') : 'â'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Gap text */}
            {data && (
              <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1', marginBottom: 8 }}>
                  HVAD MANGLER?
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                  {gapLines.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            )}

            {/* Cooldown */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-dm-mono)' }}>
                {cooldownInfo ? (
                  cooldownInfo.within
                    ? <span>Seneste kÃ¸b: {cooldownInfo.last.toLocaleDateString('da-DK')} Â· <span style={{ color: '#f59e0b' }}>â  Cooldown: {cooldownInfo.days} dage siden (90-dages regel)</span></span>
                    : <span>Seneste kÃ¸b: {cooldownInfo.last.toLocaleDateString('da-DK')} Â· <span style={{ color: '#4ade80' }}>Cooldown udlÃ¸bet</span></span>
                ) : (
                  'Ingen registreret kÃ¸b'
                )}
              </div>
              <button
                onClick={registerBuy}
                disabled={cooldownInfo?.within ?? false}
                style={{
                  background: cooldownInfo?.within ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.15)',
                  border: '1px solid ' + (cooldownInfo?.within ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.3)'),
                  color: cooldownInfo?.within ? '#475569' : '#a5b4fc',
                  fontFamily: 'var(--font-dm-mono)',
                  fontSize: 11,
                  padding: '7px 14px',
                  borderRadius: 6,
                  cursor: cooldownInfo?.within ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                RegistrÃ©r kÃ¸b i dag
              </button>
            </div>
          </div>
        </Card>

        {/* ââ METRIC CARDS 2Ã2 ââ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 40 }}>

          {/* Fear & Greed */}
          <Card accent="purple">
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>
              FEAR &amp; GREED INDEX
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <FGGauge value={data?.fearGreedIndex ?? null} />
            </div>
            {data ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-dm-mono)',
                  background: data.fearGreedIndex <= 25 ? 'rgba(239,68,68,0.15)'
                    : data.fearGreedIndex <= 45 ? 'rgba(245,158,11,0.12)'
                    : data.fearGreedIndex <= 55 ? 'rgba(234,179,8,0.12)'
                    : data.fearGreedIndex <= 75 ? 'rgba(132,204,22,0.12)'
                    : 'rgba(34,197,94,0.12)',
                  color: data.fearGreedIndex <= 25 ? '#fca5a5'
                    : data.fearGreedIndex <= 45 ? '#fcd34d'
                    : data.fearGreedIndex <= 55 ? '#fde047'
                    : data.fearGreedIndex <= 75 ? '#bef264'
                    : '#4ade80',
                }}>
                  {data.fearGreedLabel}
                </span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#334155', fontSize: 12 }}>Henterâ¦</div>
            )}
          </Card>

          {/* S&P 500 */}
          <Card accent={drawdownPct >= 0.25 ? 'green' : drawdownPct >= 0.15 ? 'orange' : 'purple'}>
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>
              S&amp;P 500
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 42, fontWeight: 500, lineHeight: 1, color: '#f1f5f9', marginBottom: 6 }}>
              {data ? data.sp500Price.toLocaleString('da-DK') : 'â'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              52-ugers high: {data ? data.sp500_52wHigh.toLocaleString('da-DK') : 'â'}
            </div>
            {data && drawdownPct >= 0.001 && (
              <span style={{
                display: 'inline-block',
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 4,
                fontFamily: 'var(--font-dm-mono)',
                background: drawdownPct >= 0.25 ? 'rgba(34,197,94,0.12)' : drawdownPct >= 0.15 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: drawdownPct >= 0.15 ? '#4ade80' : '#fcd34d',
              }}>
                â{ddPctDisplay}% fra high
              </span>
            )}
            {data && drawdownPct < 0.001 && (
              <span style={{ display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 4, background: 'rgba(71,85,105,0.2)', color: '#94a3b8' }}>
                NÃ¦r all-time high
              </span>
            )}
          </Card>

          {/* ISM PMI */}
          <Card accent="orange">
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>
              ISM MANUFACTURING PMI <span style={{ color: '#334155' }}>(manuelt)</span>
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 42, fontWeight: 500, lineHeight: 1, color: '#f1f5f9', marginBottom: 6 }}>
              {ism !== null ? ism.toFixed(1) : 'â'}
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>
              {ismSavedDate ? `Opdateret ${ismSavedDate}` : 'Ikke indlÃ¦st'} Â· Opdateres 1. hverdag/md
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <input
                ref={ismRef}
                type="number"
                value={ismInput}
                onChange={e => setIsmInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveIsm()}
                placeholder="f.eks. 49.8"
                step={0.1} min={20} max={75}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f1f5f9',
                  fontFamily: 'var(--font-dm-mono)',
                  fontSize: 13,
                  padding: '6px 10px',
                  borderRadius: 6,
                  width: 110,
                  outline: 'none',
                }}
              />
              <button
                onClick={saveIsm}
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#fcd34d',
                  fontFamily: 'var(--font-dm-mono)',
                  fontSize: 11,
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                GEM
              </button>
            </div>
            <a
              href="https://tradingeconomics.com/united-states/business-confidence"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#6366f1', opacity: 0.8, textDecoration: 'none' }}
            >
              â Se seneste tal pÃ¥ TradingEconomics
            </a>
          </Card>

          {/* Sahm Rule */}
          <Card accent={data && data.sahmRule >= 0.5 ? 'red' : data && data.sahmRule >= 0.3 ? 'orange' : 'green'}>
            <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>
              SAHM-REGEL
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, serif', fontSize: 42, fontWeight: 500, lineHeight: 1, color: '#f1f5f9', marginBottom: 6 }}>
              {data ? data.sahmRule.toFixed(2).replace('.', ',') : 'â'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              TÃ¦rskel: 0,50 Â· Recessionsindikator
            </div>
            {data && (
              <span style={{
                display: 'inline-block',
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 4,
                fontFamily: 'var(--font-dm-mono)',
                background: data.sahmRule >= 0.5 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                color: data.sahmRule >= 0.5 ? '#fca5a5' : '#4ade80',
                marginBottom: 8,
              }}>
                {data.sahmRule >= 0.5 ? 'Recessionsadvarsel â¥0,5' : 'Ingen signal <0,5'}
              </span>
            )}
            <SahmBar value={data?.sahmRule ?? null} />
          </Card>

        </div>

        {/* ââ FOOTER ââ */}
        <footer style={{ textAlign: 'center', fontSize: 10, color: '#334155', fontFamily: 'var(--font-dm-mono)', lineHeight: 1.6 }}>
          Data via Anthropic API + FRED Â· Kun til informationsformÃ¥l Â· Ikke finansiel rÃ¥dgivning
        </footer>

      </div>
    </main>
  )
}
