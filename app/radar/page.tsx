'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface RadarStock {
  id: string
  ticker: string
  name: string
  description: string
  dom: 'KØB' | 'AFVENT' | 'SKIP'
  horizon: 'kort' | 'mellem' | 'lang'
  horizonText: string
  stopLoss: number
  exitTarget: number
  currentPrice: number
  reason: string
  addedDate: string
}

const STORAGE_KEY = 'radar2026'

const INITIAL_STOCKS: RadarStock[] = [
  {
    id: '1',
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    description: 'Verdens ledende producent af GPU-chips til AI og datacentre.',
    dom: 'AFVENT',
    horizon: 'kort',
    horizonText: '6-12 måneder',
    stopLoss: 85,
    exitTarget: 160,
    currentPrice: 115,
    reason: 'Stærk fundamental case men aktien er dyr efter det seneste rally. Afvent en korrektion til under $100 før køb.',
    addedDate: '17/03/2026',
  },
  {
    id: '2',
    ticker: 'ASML',
    name: 'ASML Holding',
    description: 'Hollandsk monopolist på EUV-maskiner der er nødvendige for at producere avancerede chips.',
    dom: 'KØB',
    horizon: 'mellem',
    horizonText: '1-2 år',
    stopLoss: 650,
    exitTarget: 1100,
    currentPrice: 780,
    reason: 'Eneste leverandør af EUV-teknologi i verden. Lang ordrebogssynlighed og strukturel vækst i chipefterspørgsel.',
    addedDate: '17/03/2026',
  },
  {
    id: '3',
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway',
    description: 'Warren Buffetts konglomerat med diversificerede investeringer på tværs af sektorer.',
    dom: 'KØB',
    horizon: 'lang',
    horizonText: '5+ år',
    stopLoss: 380,
    exitTarget: 700,
    currentPrice: 480,
    reason: 'Defensivt anker i en langsigtet portefølje. Buffett-efterfølgeren Greg Abel vurderes positivt af markedet.',
    addedDate: '17/03/2026',
  },
]

const DOM_CONFIG = {
  KØB: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)', emoji: '✅' },
  AFVENT: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)', emoji: '⏳' },
  SKIP: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)', emoji: '❌' },
}

const HORIZON_ACCENT = { kort: '#f59e0b', mellem: '#6366f1', lang: '#22c55e' }

/* ─── Navigation ─────────────────────────────────────── */
function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(7,9,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ color: '#334155' }}>◈</span>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>Makro Signal</Link>
      <Link href="/portfolio" style={{ color: '#475569', textDecoration: 'none' }}>The 2026 Run</Link>
      <Link href="/radar" style={{ color: '#f1f5f9', textDecoration: 'none', borderBottom: '1px solid #f59e0b', paddingBottom: 2 }}>Aktie Radar</Link>
    </nav>
  )
}

/* ─── Modal ─────────────────────────────────────────── */
function StockModal({
  stock,
  onClose,
  onSave,
}: {
  stock: Partial<RadarStock> | null
  onClose: () => void
  onSave: (s: RadarStock) => void
}) {
  const isEdit = !!(stock && stock.id)
  const [searchTicker, setSearchTicker] = useState(stock?.ticker || '')
  const [analysing, setAnalysing] = useState(false)
  const [ticker, setTicker] = useState(stock?.ticker || '')
  const [name, setName] = useState(stock?.name || '')
  const [description, setDescription] = useState(stock?.description || '')
  const [dom, setDom] = useState<RadarStock['dom']>(stock?.dom || 'AFVENT')
  const [horizon, setHorizon] = useState<RadarStock['horizon']>(stock?.horizon || 'mellem')
  const [horizonText, setHorizonText] = useState(stock?.horizonText || '')
  const [currentPrice, setCurrentPrice] = useState(stock?.currentPrice?.toString() || '')
  const [stopLoss, setStopLoss] = useState(stock?.stopLoss?.toString() || '')
  const [exitTarget, setExitTarget] = useState(stock?.exitTarget?.toString() || '')
  const [reason, setReason] = useState(stock?.reason || '')

  async function runAnalysis() {
    if (!searchTicker.trim()) return
    setAnalysing(true)
    try {
      const res = await fetch('/api/radar-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: searchTicker.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.ticker) {
        setTicker(data.ticker)
        setName(data.name || '')
        setDescription(data.description || '')
        setDom(data.dom || 'AFVENT')
        setHorizon(data.horizon || 'mellem')
        setHorizonText(data.horizonText || '')
        setCurrentPrice(data.currentPrice?.toString() || '')
        setStopLoss(data.stopLoss?.toString() || '')
        setExitTarget(data.exitTarget?.toString() || '')
        setReason(data.reason || '')
      }
    } catch (e) {
      console.error('Analysis failed', e)
    }
    setAnalysing(false)
  }

  function handleSave() {
    if (!ticker || !name) return
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    onSave({
      id: (stock && stock.id) ? stock.id : Date.now().toString(),
      ticker: ticker.toUpperCase(),
      name,
      description,
      dom,
      horizon,
      horizonText,
      currentPrice: parseFloat(currentPrice) || 0,
      stopLoss: parseFloat(stopLoss) || 0,
      exitTarget: parseFloat(exitTarget) || 0,
      reason,
      addedDate: (stock && stock.addedDate) ? stock.addedDate : `${dd}/${mm}/${yyyy}`,
    })
  }

  const inp = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#f1f5f9',
    fontFamily: 'var(--font-dm-mono)',
    fontSize: 12,
    outline: 'none',
  }
  const lbl = {
    fontSize: 10,
    color: '#475569',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
    display: 'block',
    fontFamily: 'var(--font-dm-mono)',
  }
  const row = { marginBottom: 14 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, fontWeight: 600 }}>
            {isEdit ? 'Rediger aktie' : 'Tilføj aktie'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* AI search — only for new stocks */}
        {!isEdit && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={lbl}>Søg og analysér med AI</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={searchTicker}
                onChange={e => setSearchTicker(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runAnalysis() }}
                placeholder="Skriv ticker eller virksomhedsnavn — f.eks. NOVO eller Apple"
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={runAnalysis}
                disabled={analysing}
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: analysing ? '#475569' : '#a78bfa', borderRadius: 6, padding: '8px 16px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: analysing ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {analysing ? 'Analyserer…' : '🔍 Analysér'}
              </button>
            </div>
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={row}>
            <label style={lbl}>Ticker</label>
            <input value={ticker} onChange={e => setTicker(e.target.value)} style={inp} placeholder="AAPL" />
          </div>
          <div style={row}>
            <label style={lbl}>Dom</label>
            <select value={dom} onChange={e => setDom(e.target.value as RadarStock['dom'])} style={{ ...inp, cursor: 'pointer' }}>
              <option value="KØB">✅ KØB</option>
              <option value="AFVENT">⏳ AFVENT</option>
              <option value="SKIP">❌ SKIP</option>
            </select>
          </div>
        </div>

        <div style={row}>
          <label style={lbl}>Virksomhedsnavn</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Apple Inc." />
        </div>

        <div style={row}>
          <label style={lbl}>Beskrivelse</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inp} placeholder="Kort beskrivelse af virksomheden" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={row}>
            <label style={lbl}>Tidshorisont</label>
            <select value={horizon} onChange={e => setHorizon(e.target.value as RadarStock['horizon'])} style={{ ...inp, cursor: 'pointer' }}>
              <option value="kort">Kort (under 1 år)</option>
              <option value="mellem">Mellem (1-3 år)</option>
              <option value="lang">Lang (3+ år)</option>
            </select>
          </div>
          <div style={row}>
            <label style={lbl}>Horisont beskrivelse</label>
            <input value={horizonText} onChange={e => setHorizonText(e.target.value)} style={inp} placeholder="6-12 måneder" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <div style={row}>
            <label style={lbl}>Nuværende kurs</label>
            <input value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} style={inp} type="number" placeholder="100" />
          </div>
          <div style={row}>
            <label style={lbl}>Stop loss</label>
            <input value={stopLoss} onChange={e => setStopLoss(e.target.value)} style={inp} type="number" placeholder="80" />
          </div>
          <div style={row}>
            <label style={lbl}>Exit mål</label>
            <input value={exitTarget} onChange={e => setExitTarget(e.target.value)} style={inp} type="number" placeholder="150" />
          </div>
        </div>

        <div style={row}>
          <label style={lbl}>Begrundelse</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ ...inp, minHeight: 90, resize: 'vertical' }}
            placeholder="2-3 sætninger om hvorfor denne aktie er interessant..."
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
            Annuller
          </button>
          <button onClick={handleSave} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a78bfa', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>
            Gem aktie
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Stock Card ─────────────────────────────────────── */
function StockCard({
  stock,
  accent,
  onEdit,
  onDelete,
}: {
  stock: RadarStock
  accent: string
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = DOM_CONFIG[stock.dom]
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
      {/* Accent line */}
      <div style={{ height: 2, background: accent }} />

      <div style={{ padding: '14px 16px 16px' }}>
        {/* Edit / delete */}
        <div style={{ position: 'absolute', top: 14, right: 12, display: 'flex', gap: 6 }}>
          <button onClick={onEdit} title="Rediger" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 13, padding: 2, lineHeight: 1 }}>✏</button>
          <button onClick={onDelete} title="Slet" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 13, padding: 2, lineHeight: 1 }}>✕</button>
        </div>

        {/* Ticker + name */}
        <div style={{ marginBottom: 10, paddingRight: 48 }}>
          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 16, fontWeight: 500, color: '#f1f5f9' }}>{stock.ticker}</span>
          <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, color: '#64748b', marginTop: 2 }}>{stock.name}</div>
        </div>

        {/* DOM badge */}
        <div style={{ background: cfg.bg, border: '1px solid ' + cfg.border, borderRadius: 6, padding: '6px 12px', marginBottom: 12, textAlign: 'center', fontFamily: 'var(--font-dm-mono)', fontSize: 12, fontWeight: 500, color: cfg.text, letterSpacing: '0.06em' }}>
          {cfg.emoji} {stock.dom}
        </div>

        {/* Data rows */}
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
          <div>
            <span style={{ color: '#334155' }}>Tidshorisont: </span>
            <span style={{ color: '#94a3b8' }}>{stock.horizonText}</span>
          </div>
          <div>
            <span style={{ color: '#334155' }}>Stop loss: </span>
            <span style={{ color: '#ef4444' }}>${stock.stopLoss}</span>
            <span style={{ color: '#475569' }}> — sælg hvis kursen falder hertil</span>
          </div>
          <div>
            <span style={{ color: '#334155' }}>Exit mål: </span>
            <span style={{ color: '#22c55e' }}>${stock.exitTarget}</span>
            <span style={{ color: '#475569' }}> — sælg når kursen når hertil</span>
          </div>
          <div>
            <span style={{ color: '#334155' }}>Tilføjet: </span>
            <span style={{ color: '#475569' }}>{stock.addedDate}</span>
          </div>
        </div>

        {/* Reason */}
        <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 13, color: '#64748b', lineHeight: 1.65, margin: 0 }}>
          {stock.reason}
        </p>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────── */
export default function RadarPage() {
  const [stocks, setStocks] = useState<RadarStock[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editStock, setEditStock] = useState<RadarStock | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setStocks(saved ? JSON.parse(saved) : INITIAL_STOCKS)
  }, [])

  function persist(next: RadarStock[]) {
    setStocks(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function handleSave(s: RadarStock) {
    if (editStock) {
      persist(stocks.map(x => (x.id === s.id ? s : x)))
    } else {
      persist([...stocks, s])
    }
    setModalOpen(false)
    setEditStock(null)
  }

  function handleDelete(id: string) {
    if (confirm('Slet aktien fra radar?')) persist(stocks.filter(x => x.id !== id))
  }

  function openAdd() {
    setEditStock(null)
    setModalOpen(true)
  }

  function openEdit(s: RadarStock) {
    setEditStock(s)
    setModalOpen(true)
  }

  const columns = [
    { key: 'kort' as const, label: 'Kort', sub: 'Under 1 år', accent: HORIZON_ACCENT.kort },
    { key: 'mellem' as const, label: 'Mellem', sub: '1–3 år', accent: HORIZON_ACCENT.mellem },
    { key: 'lang' as const, label: 'Lang', sub: '3+ år', accent: HORIZON_ACCENT.lang },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#07090f' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>
        {/* Page header */}
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#f59e0b', letterSpacing: '0.12em', marginBottom: 8 }}>
          ◈ AKTIE RADAR
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 42, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.1 }}>
            Ugentlig <em>Aktieanalyse</em>
          </h1>
          <button
            onClick={openAdd}
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a78bfa', borderRadius: 8, padding: '9px 18px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            ＋ Tilføj aktie
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#475569', marginBottom: 36 }}>
          Analyseret og vurderet — klar til beslutning
        </div>

        {/* Three-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
          {columns.map(col => {
            const colStocks = stocks.filter(s => s.horizon === col.key)
            return (
              <div key={col.key}>
                {/* Column header */}
                <div style={{ borderTop: '2px solid ' + col.accent, paddingTop: 14, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                    {col.label}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#475569' }}>{col.sub}</span>
                    <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: col.accent, background: col.accent + '18', padding: '2px 8px', borderRadius: 4 }}>
                      {colStocks.length} {colStocks.length === 1 ? 'aktie' : 'aktier'}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {colStocks.length === 0 ? (
                    <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#334155', textAlign: 'center', padding: '28px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 8 }}>
                      Ingen aktier endnu
                    </div>
                  ) : (
                    colStocks.map(s => (
                      <StockCard
                        key={s.id}
                        stock={s}
                        accent={col.accent}
                        onEdit={() => openEdit(s)}
                        onDelete={() => handleDelete(s.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

                {/* ── ROTATIONSREGEL ──────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 24px', marginTop: 16 }}>
          <div style={{ fontSize: 10, color: '#6366f1', letterSpacing: '0.1em', marginBottom: 16 }}>ROTATIONSREGEL</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Rotér IND */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.08em', marginBottom: 10 }}>↓ ROTÉR IND I VÆKST</div>
              {[
                { label: 'Fear & Greed under 25', active: true, value: 'F&G = 16' },
                { label: 'S&P 500 faldet over 10% fra high', active: true, value: '−5.4% fra high' },
                { label: 'Fald under 2 uger (overreaktion)', active: false, value: '—' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.active ? '#22c55e' : '#334155', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: c.active ? '#94a3b8' : '#475569', flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 9, color: c.active ? '#22c55e' : '#334155' }}>{c.value}</span>
                </div>
              ))}
              <div style={{ fontSize: 9, color: '#334155', marginTop: 8 }}>Min. 2 af 3 skal være opfyldt</div>
            </div>

            {/* Rotér UD */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: '0.08em', marginBottom: 10 }}>↑ ROTÉR UD AF VÆKST</div>
              {[
                { label: 'Fear & Greed over 75', active: false, value: 'F&G = 16' },
                { label: 'S&P 500 under 5% fra ATH', active: false, value: '−5.4% fra high' },
                { label: 'Mindst én aktie nær exit mål', active: false, value: '—' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.active ? '#22c55e' : '#334155', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: c.active ? '#94a3b8' : '#475569', flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: 9, color: c.active ? '#22c55e' : '#334155' }}>{c.value}</span>
                </div>
              ))}
              <div style={{ fontSize: 9, color: '#334155', marginTop: 8 }}>Min. 2 af 3 skal være opfyldt</div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Rotationer brugt i år', value: '1 af 3', color: '#22c55e' },
              { label: 'Sidst roteret', value: 'Apr 2026', color: '#94a3b8' },
              { label: 'Cooldown opfyldt', value: 'Nej (+15pt mangler)', color: '#f59e0b' },
              { label: 'Max pr. rotation', value: '2 aktier', color: '#64748b' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '6px 12px' }}>
                <div style={{ fontSize: 8, color: '#475569', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: s.color, fontFamily: 'var(--font-dm-mono)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Aktuel rotation */}
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 4 }}>◈ AKTUEL ROTATION — APRIL 2026</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>NU + DLO købt som rotationskøb under Extreme Fear (Fear & Greed = 16)</div>
          </div>

          {/* Regler */}
          <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.7 }}>
            {[
              'Max 2 aktier per rotation · Max 3 rotationer per år',
              'Cooldown: F&G skal stige +15 point siden sidste rotation',
              'Kerneaktier (NOVO, UIE, DSV, CCJ, ETN) må aldrig roteres ud',
              'Kun aktier på godkendt watchlist — aldrig nye under panik',
              'Stop loss gælder altid uanset rotationsstatus',
            ].map((r, i) => (
              <div key={i}>· {r}</div>
            ))}
          </div>
        </div>


{/* Footer */}
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#334155', letterSpacing: '0.06em', paddingBottom: 40 }}>
          ANALYSER BASERET PÅ AI-RESEARCH · IKKE FINANSIEL RÅDGIVNING · OPDATERES UGENTLIGT
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <StockModal
          stock={editStock}
          onClose={() => { setModalOpen(false); setEditStock(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
