'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ActivePosition {
  id: string
  ticker: string
  name: string
  category: 'Kerne' | 'Vækst' | 'Spekulativ'
  invested: number
  stopLoss: number
  exitTarget: number
  currentPrice: number
  currency: string
  checked: boolean
}

interface PlannedBuy {
  ticker: string
  name: string
  category: 'Kerne' | 'Vækst' | 'Spekulativ'
  amount: number
  currency: string
  plannedMonth: string
}

const STORAGE_KEY = 'portefolje2026'

/* ─── Initial Data ───────────────────────────────────────────────────── */
const INITIAL_POSITIONS: ActivePosition[] = [
  {
    id: '1',
    ticker: 'GN',
    name: 'GN Store Nord',
    category: 'Kerne',
    invested: 5022,
    stopLoss: 68,
    exitTarget: 145,
    currentPrice: 94.72,
    currency: 'DKK',
    checked: false,
  },
  {
    id: '2',
    ticker: 'NOVO-B',
    name: 'Novo Nordisk',
    category: 'Kerne',
    invested: 5105,
    stopLoss: 200,
    exitTarget: 380,
    currentPrice: 231.95,
    currency: 'DKK',
    checked: false,
  },
  {
    id: '3',
    ticker: 'UIE',
    name: 'UIE A/S',
    category: 'Kerne',
    invested: 4800,
    stopLoss: 300,
    exitTarget: 500,
    currentPrice: 367.50,
    currency: 'DKK',
    checked: false,
  },
]
const PLANNED_BUYS: PlannedBuy[] = [
  { ticker: 'NU', name: 'NU Holdings', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2026-05' },
  { ticker: 'AMD', name: 'AMD', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2026-06' },
  { ticker: 'CCJ', name: 'Cameco', category: 'Kerne', amount: 6000, currency: 'USD', plannedMonth: '2026-07' },
  { ticker: 'DEMANT', name: 'Demant', category: 'Vækst', amount: 5000, currency: 'DKK', plannedMonth: '2026-08' },
  { ticker: 'DSV', name: 'DSV', category: 'Kerne', amount: 6000, currency: 'DKK', plannedMonth: '2026-10' },
  { ticker: 'DLO', name: 'dLocal', category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2026-11' },
  { ticker: 'UIE', name: 'UIE', category: 'Kerne', amount: 6000, currency: 'DKK', plannedMonth: '2027-01' },
  { ticker: 'METC', name: 'METC Ramaco', category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2027-02' },
  { ticker: 'NVDA', name: 'Nvidia', category: 'Kerne', amount: 6000, currency: 'USD', plannedMonth: '2027-03' },
  { ticker: 'NXE', name: 'NexGen Energy', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2027-04' },
  { ticker: 'NETC', name: 'Netcompany', category: 'Vækst', amount: 5000, currency: 'DKK', plannedMonth: '2027-05' },
  { ticker: 'GOLD', name: 'Barrick Gold', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2027-06' },
  { ticker: '005930', name: 'Samsung', category: 'Kerne', amount: 6000, currency: 'KRW', plannedMonth: '2027-08' },
  { ticker: 'UUUU', name: 'Energy Fuels', category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2027-09' },
  { ticker: 'YCA', name: 'Yellow Cake', category: 'Spekulativ', amount: 4000, currency: 'GBp', plannedMonth: '2027-10' },
  { ticker: 'NEM', name: 'Newmont', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2027-11' },
  { ticker: 'HDB', name: 'HDFC Bank', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2027-12' },
  { ticker: 'TBD1', name: 'Ny aktie TBD', category: 'Vækst', amount: 5000, currency: 'USD', plannedMonth: '2028-01' },
  { ticker: 'TBD2', name: 'Ny aktie TBD', category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2028-01' },
]

/* ─── Helpers ────────────────────────────────────────────────────────── */
const CAT_COLOR = { Kerne: '#6366f1', Vækst: '#22c55e', Spekulativ: '#f59e0b' }

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  return `${names[parseInt(m) - 1]} ${y}`
}

function daysUntil(ym: string) {
  const now = new Date()
  const target = new Date(parseInt(ym.split('-')[0]), parseInt(ym.split('-')[1]) - 1, 1)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function isPast(ym: string) {
  return daysUntil(ym) <= 0
}

function nextMonthlyCheck() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  while (first.getDay() === 0 || first.getDay() === 6) first.setDate(first.getDate() + 1)
  return first.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─── Navigation ─────────────────────────────────────────────────────── */
function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(7,9,15,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ color: '#334155' }}>◈</span>
      <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>Makro Signal</Link>
      <Link href="/portfolio" style={{ color: '#475569', textDecoration: 'none' }}>The 2026 Run</Link>
      <Link href="/radar" style={{ color: '#475569', textDecoration: 'none' }}>Aktie Radar</Link>
      <Link href="/portefolje" style={{ color: '#f1f5f9', textDecoration: 'none', borderBottom: '1px solid #6366f1', paddingBottom: 2 }}>Min Portefølje</Link>
    </nav>
  )
}

/* ─── Price Bar ──────────────────────────────────────────────────────── */
function PriceBar({ stopLoss, exitTarget, currentPrice }: { stopLoss: number; exitTarget: number; currentPrice: number }) {
  const pct = Math.max(0, Math.min(100, ((currentPrice - stopLoss) / (exitTarget - stopLoss)) * 100))
  const zone = pct < 30 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#334155', marginBottom: 6 }}>
        <span>STOP {stopLoss}</span>
        <span style={{ color: zone, fontWeight: 500 }}>Kurs ~{currentPrice}</span>
        <span>MÅL {exitTarget}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #ef4444, ${zone})`, borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: -4, left: `${pct}%`, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: zone, border: '2px solid #07090f' }} />
      </div>
    </div>
  )
}

/* ─── Position Card ──────────────────────────────────────────────────── */
function PositionCard({
  pos,
  onEdit,
  onToggleCheck,
}: {
  pos: ActivePosition
  onEdit: (p: ActivePosition) => void
  onToggleCheck: (id: string) => void
}) {
  const accent = CAT_COLOR[pos.category]
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 2, background: accent }} />
      <div style={{ padding: '14px 16px 16px', position: 'relative' }}>
        <button onClick={() => onEdit(pos)} title="Rediger" style={{ position: 'absolute', top: 14, right: 12, background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 13 }}>✏</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingRight: 28 }}>
          <input type="checkbox" checked={pos.checked} onChange={() => onToggleCheck(pos.id)} style={{ marginTop: 3, accentColor: accent }} />
          <div>
            <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 16, fontWeight: 500, color: '#f1f5f9' }}>{pos.ticker}</span>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 13, color: '#64748b', marginTop: 2 }}>{pos.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', background: accent + '22', border: '1px solid ' + accent + '44', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: accent, letterSpacing: '0.06em' }}>{pos.category.toUpperCase()}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <div><span style={{ color: '#334155' }}>Investeret: </span><span style={{ color: '#94a3b8' }}>{pos.invested.toLocaleString('da-DK')} DKK</span></div>
          <div style={{ color: '#ef4444' }}>⬇ Sælg altid under: {pos.stopLoss} {pos.currency}</div>
          <div style={{ color: '#22c55e' }}>⬆ Tag gevinst ved: {pos.exitTarget} {pos.currency}</div>
        </div>
        <PriceBar stopLoss={pos.stopLoss} exitTarget={pos.exitTarget} currentPrice={pos.currentPrice} />
      </div>
    </div>
  )
}

/* ─── Edit Modal ─────────────────────────────────────────────────────── */
function EditModal({ pos, onClose, onSave }: { pos: ActivePosition; onClose: () => void; onSave: (p: ActivePosition) => void }) {
  const [stopLoss, setStopLoss] = useState(pos.stopLoss.toString())
  const [exitTarget, setExitTarget] = useState(pos.exitTarget.toString())
  const [currentPrice, setCurrentPrice] = useState(pos.currentPrice.toString())
  const [invested, setInvested] = useState(pos.invested.toString())
  const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', color: '#f1f5f9', fontFamily: 'var(--font-dm-mono)', fontSize: 12, outline: 'none' }
  const lbl = { fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, display: 'block', fontFamily: 'var(--font-dm-mono)' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 600 }}>Rediger {pos.ticker}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {[
            { label: 'Aktuel kurs', val: currentPrice, set: setCurrentPrice },
            { label: 'Investeret (DKK)', val: invested, set: setInvested },
            { label: 'Stop loss', val: stopLoss, set: setStopLoss },
            { label: 'Exit mål', val: exitTarget, set: setExitTarget },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <label style={lbl}>{label}</label>
              <input value={val} onChange={e => set(e.target.value)} type="number" style={inp} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>Annuller</button>
          <button onClick={() => onSave({ ...pos, currentPrice: parseFloat(currentPrice) || 0, stopLoss: parseFloat(stopLoss) || 0, exitTarget: parseFloat(exitTarget) || 0, invested: parseFloat(invested) || 0 })} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a78bfa', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>Gem</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Planned Card ───────────────────────────────────────────────────── */
function PlannedCard({ buy }: { buy: PlannedBuy }) {
  const past = isPast(buy.plannedMonth)
  const days = daysUntil(buy.plannedMonth)
  const accent = CAT_COLOR[buy.category]
  const isTbd = buy.ticker.startsWith('TBD')
  return (
    <div style={{ background: past ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${past ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 8, padding: '12px 14px', opacity: isTbd ? 0.45 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, fontWeight: 500, color: past ? '#a78bfa' : '#64748b' }}>{buy.ticker}</span>
          <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 12, color: '#475569', marginTop: 1 }}>{buy.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: past ? '#a78bfa' : '#334155' }}>{fmtMonth(buy.plannedMonth)}</div>
          {!past && <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#334155', marginTop: 2 }}>{days}d</div>}
          {past && <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#6366f1', marginTop: 2 }}>KØB NU</div>}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ background: accent + '18', border: '1px solid ' + accent + '33', borderRadius: 3, padding: '1px 6px', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: accent }}>{buy.category.toUpperCase()}</div>
        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#475569' }}>{buy.amount.toLocaleString('da-DK')} {buy.currency}</span>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function PortefoeljePage() {
  const [positions, setPositions] = useState<ActivePosition[]>([])
  const [editPos, setEditPos] = useState<ActivePosition | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setPositions(saved ? JSON.parse(saved) : INITIAL_POSITIONS)
  }, [])

  function persist(next: ActivePosition[]) {
    setPositions(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function handleSave(p: ActivePosition) {
    persist(positions.map(x => x.id === p.id ? p : x))
    setEditPos(null)
  }

  function toggleCheck(id: string) {
    persist(positions.map(x => x.id === id ? { ...x, checked: !x.checked } : x))
  }

  const totalSlots = 20
  const usedSlots = positions.length
  const totalInvested = positions.reduce((s, p) => s + p.invested, 0)
  const nextBuy = PLANNED_BUYS.find(b => daysUntil(b.plannedMonth) >= 0) || PLANNED_BUYS[0]
  const daysToNext = daysUntil(nextBuy.plannedMonth)

  const kerne = positions.filter(p => p.category === 'Kerne').length
  const vaekst = positions.filter(p => p.category === 'Vækst').length
  const spek = positions.filter(p => p.category === 'Spekulativ').length

  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'

  return (
    <div style={{ minHeight: '100vh', background: '#07090f' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* Page Header */}
        <div style={{ fontFamily: mono, fontSize: 10, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 8 }}>◈ MIN PORTEFØLJE</div>
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontFamily: corm, fontSize: 42, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.1 }}>
            Enkeltaktier <em>Langsigtet</em>
          </h1>
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: '#475569', marginBottom: 36 }}>
          20 aktier · 1 køb om måneden · Fuldt investeret januar 2028
        </div>

        {/* ── SEKTION 1: Overblik ──────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '22px 24px', marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 18 }}>PORTEFØLJEOVERBLIK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Pladser brugt', value: `${usedSlots}/20`, sub: `${totalSlots - usedSlots} ledige` },
              { label: 'Investeret', value: `${totalInvested.toLocaleString('da-DK')} DKK`, sub: 'Fri kapital' },
              { label: 'Næste køb', value: nextBuy.ticker, sub: `${nextBuy.name} · ${fmtMonth(nextBuy.plannedMonth)}` },
              { label: 'Dage til næste', value: daysToNext > 0 ? `${daysToNext}d` : 'NU', sub: daysToNext <= 0 ? 'Klar til køb' : 'fra i dag' },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.08em', marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: corm, fontSize: 24, fontWeight: 600, color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#334155', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(usedSlots / 20) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            </div>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#334155', marginTop: 4 }}>{usedSlots} af 20 pladser fyldt</div>
          </div>

          {/* Sub-categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Kerne', filled: kerne, total: 6, color: '#6366f1' },
              { label: 'Vækst', filled: vaekst, total: 9, color: '#22c55e' },
              { label: 'Spekulativ', filled: spek, total: 5, color: '#f59e0b' },
            ].map(({ label, filled, total, color }) => (
              <div key={label} style={{ background: color + '10', border: '1px solid ' + color + '25', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color, letterSpacing: '0.08em', marginBottom: 4 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: corm, fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>{filled}/{total}</div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${(filled / total) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEKTION 2: Aktive Positioner ─────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 16 }}>AKTIVE POSITIONER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {positions.map(pos => (
              <PositionCard key={pos.id} pos={pos} onEdit={setEditPos} onToggleCheck={toggleCheck} />
            ))}
          </div>
        </div>

        {/* ── SEKTION 3: Købeplan ──────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 16 }}>KØBEPLAN · MAJ 2026 – JAN 2028</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {PLANNED_BUYS.map((buy, i) => (
              <PlannedCard key={i} buy={buy} />
            ))}
          </div>
        </div>

        {/* ── SEKTION 4 + 5 side om side ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

          {/* Reglerne */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 16 }}>REGLERNE</div>
            {[
              { emoji: '🔴', title: 'Stop loss er hellig', body: 'Alarm udløser = sælg inden 24 timer. Ingen undtagelser.' },
              { emoji: '🟡', title: 'Ingen beslutninger på røde dage', body: 'Markedet falder voldsomt = vent 48 timer.' },
              { emoji: '🔵', title: 'Max 20 enkeltaktier', body: 'Vil du købe nummer 21 skal du sælge én af de 20 først.' },
            ].map(({ emoji, title, body }) => (
              <div key={title} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontFamily: corm, fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{emoji} {title}</div>
                <div style={{ fontFamily: corm, fontStyle: 'italic', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{body}</div>
              </div>
            ))}
          </div>

          {/* Ved markedskrak */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 16 }}>VED MARKEDSKRAK</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: mono, fontSize: 9, color: '#334155', textAlign: 'left', paddingBottom: 10, letterSpacing: '0.06em' }}>FALD</th>
                  <th style={{ fontFamily: mono, fontSize: 9, color: '#334155', textAlign: 'left', paddingBottom: 10, letterSpacing: '0.06em' }}>HANDLING</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { fald: 'Under 5% på én dag', handling: 'Vent 48 timer' },
                  { fald: 'Over 20% fra toppunkt', handling: 'Sælg ved stop loss — bliv i cash' },
                  { fald: 'Op 15% fra bund', handling: 'Køb ind igen' },
                ].map(({ fald, handling }) => (
                  <tr key={fald} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ fontFamily: corm, fontStyle: 'italic', fontSize: 13, color: '#64748b', padding: '9px 0', paddingRight: 16, lineHeight: 1.4 }}>{fald}</td>
                    <td style={{ fontFamily: corm, fontSize: 13, color: '#94a3b8', padding: '9px 0', lineHeight: 1.4 }}>{handling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEKTION 6: Månedligt tjek ────────────────────────────────── */}
        <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#6366f1', letterSpacing: '0.1em', marginBottom: 6 }}>MÅNEDLIGT TJEK</div>
              <div style={{ fontFamily: corm, fontSize: 16, color: '#f1f5f9' }}>📅 Er dine aktier over 200-dages gennemsnit?</div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#475569', textAlign: 'right' }}>
              <div style={{ color: '#334155', marginBottom: 2 }}>Næste tjek</div>
              <div>{nextMonthlyCheck()}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {positions.map(pos => (
              <label key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                <input type="checkbox" checked={pos.checked} onChange={() => toggleCheck(pos.id)} style={{ accentColor: '#6366f1' }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: pos.checked ? '#6366f1' : '#475569' }}>{pos.ticker} — {pos.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 9, color: '#334155', letterSpacing: '0.06em', paddingBottom: 40 }}>
          NORDNET · FRIE MIDLER DEPOT · IKKE FINANSIEL RÅDGIVNING
        </div>
      </div>

      {/* Edit Modal */}
      {editPos && <EditModal pos={editPos} onClose={() => setEditPos(null)} onSave={handleSave} />}
    </div>
  )
}
