'use client'

import { useState, useEffect, type ReactNode } from 'react'
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
  price?: string
  stop?: string
  exit?: string
  note?: string
}

interface Sma200Data {
  ticker: string
  name: string
  currentPrice: number
  sma200: number
  above: boolean
}

const STORAGE_KEY = 'portefolje2026'

/* ─── Initial Data ───────────────────────────────────────────────────── */
const INITIAL_POSITIONS: ActivePosition[] = [
  {
    id: '1',
    ticker: 'GN',
    name: 'GN Store Nord',
    category: 'Vækst',
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
    invested: 6000,
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
    invested: 6000,
    stopLoss: 300,
    exitTarget: 500,
    currentPrice: 367.50,
    currency: 'DKK',
    checked: false,
  },
]
const PLANNED_BUYS: PlannedBuy[] = [
  { ticker: 'NU',     name: 'NU Holdings',       category: 'Vækst',      amount: 5000, currency: 'USD', plannedMonth: '2026-04', price: '~$13,89',    stop: '$10,50',   exit: '$22',       note: 'Rotationskøb — Extreme Fear' },
  { ticker: 'DLO',    name: 'dLocal',             category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2026-04', price: '~$11,45',    stop: '$8,50',    exit: '$20',       note: 'Rotationskøb — Extreme Fear' },
  { ticker: 'DEMANT', name: 'Demant',             category: 'Vækst',      amount: 5000, currency: 'DKK', plannedMonth: '2026-05', price: '~187 DKK',   stop: '155 DKK',  exit: '280 DKK',   note: 'Afvent Q1 5. maj' },
  { ticker: 'EQIX',   name: 'Equinix',            category: 'Kerne',      amount: 6000, currency: 'USD', plannedMonth: '2026-06', price: '~$974',      stop: '$760',     exit: '$1.300',    note: 'OK' },
  { ticker: 'CCJ',    name: 'Cameco',             category: 'Kerne',      amount: 6000, currency: 'USD', plannedMonth: '2026-07', price: '$110',       stop: '$82',      exit: '$165',      note: 'OK' },
  { ticker: 'DSV',    name: 'DSV',                category: 'Kerne',      amount: 6000, currency: 'DKK', plannedMonth: '2026-08', price: '~1.588 DKK', stop: '950 DKK',  exit: '2.000 DKK', note: 'OK' },
  { ticker: 'CRDO',   name: 'Credo Technology',   category: 'Spekulativ', amount: 4000, currency: 'USD', plannedMonth: '2026-11', price: '~$102',      stop: '$80',      exit: '$160',      note: 'Hold øje — nær stop' },
  { ticker: 'ETN',    name: 'Eaton',              category: 'Kerne',      amount: 5000, currency: 'USD', plannedMonth: '2026-11', price: '~$360',      stop: '$275',     exit: '$480',      note: 'OK' },
  { ticker: 'IBN',    name: 'ICICI Bank',         category: 'Vækst',      amount: 4000, currency: 'USD', plannedMonth: '2026-12', price: '~$26,80',    stop: '$21',      exit: '$45',       note: 'OK' },
  { ticker: 'TBD',    name: 'Åben',          category: 'Vækst',      amount: 5000, currency: 'USD', plannedMonth: '2027-01', note: 'Åben' },
]

/* ─── Helpers ────────────────────────────────────────────────────────── */
const CAT_COLOR = { Kerne: '#111111', Vækst: '#2d6a3f', Spekulativ: '#8a6a00' }

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
    <nav style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '10px 24px', background: 'rgba(242,239,230,0.97)', borderBottom: '1px solid rgba(0,0,0,0.09)', fontFamily: 'var(--font-dm-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ color: '#999999' }}>◈</span>
      <Link href="/portefolje" style={{ color: '#111111', textDecoration: 'none', borderBottom: '1px solid #111111', paddingBottom: 2 }}>Min Portfolio</Link>
      <Link href="/krisekob" style={{ color: '#999999', textDecoration: 'none' }}>Krisekøb ETF</Link>
    </nav>
  )
}

/* ─── Price Bar ──────────────────────────────────────────────────────── */
function PriceBar({ stopLoss, exitTarget, currentPrice, liveOk }: { stopLoss: number; exitTarget: number; currentPrice: number; liveOk?: boolean }) {
  const pct = Math.max(0, Math.min(100, ((currentPrice - stopLoss) / (exitTarget - stopLoss)) * 100))
  const zone = pct < 30 ? '#8b1c1c' : pct < 70 ? '#8a6a00' : '#2d6a3f'
  const toStop = ((currentPrice - stopLoss) / currentPrice) * 100
  const toExit = ((exitTarget - currentPrice) / currentPrice) * 100
  const stopClr = toStop < 10 ? '#c0392b' : '#999999'
  const exitClr = toExit < 15 ? '#2d6a3f' : '#999999'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#999999', marginBottom: 6 }}>
        <span>STOP {stopLoss} <span style={{ color: stopClr }}>−{toStop.toFixed(1)}%</span></span>
        <span style={{ color: zone, fontWeight: 500 }}>
          Kurs {currentPrice}
          {liveOk === false && <span style={{ color: '#aaaaaa', fontWeight: 400 }}> (ikke opdateret)</span>}
        </span>
        <span><span style={{ color: exitClr }}>+{toExit.toFixed(1)}% </span>MÅL {exitTarget}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 4, position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #8b1c1c, ${zone})`, borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: -4, left: `${pct}%`, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: zone, border: '2px solid #f2efe6' }} />
      </div>
    </div>
  )
}

/* ─── Position Card ──────────────────────────────────────────────────── */
function PositionCard({
  pos,
  onEdit,
  onToggleCheck,
  smaData,
  liveOk,
}: {
  pos: ActivePosition
  onEdit: (p: ActivePosition) => void
  onToggleCheck: (id: string) => void
  smaData?: Sma200Data[] | null
  liveOk?: boolean
}) {
  const accent = CAT_COLOR[pos.category]
  return (
    <div style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 2, background: accent }} />
      <div style={{ padding: '14px 16px 16px', position: 'relative' }}>
        <button onClick={() => onEdit(pos)} title="Rediger" style={{ position: 'absolute', top: 14, right: 12, background: 'none', border: 'none', color: '#999999', cursor: 'pointer', fontSize: 13 }}>✏</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingRight: 28 }}>
          <input type="checkbox" checked={pos.checked} onChange={() => onToggleCheck(pos.id)} style={{ marginTop: 3, accentColor: accent }} />
          <div>
            <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 16, fontWeight: 500, color: '#111111' }}>{pos.ticker}</span>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 13, color: '#777777', marginTop: 2 }}>{pos.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', background: accent + '22', border: '1px solid ' + accent + '44', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: accent, letterSpacing: '0.06em' }}>{pos.category.toUpperCase()}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          <div><span style={{ color: '#999999' }}>Investeret: </span><span style={{ color: '#555555' }}>{pos.invested.toLocaleString('da-DK')} DKK</span></div>
        </div>
        <PriceBar stopLoss={pos.stopLoss} exitTarget={pos.exitTarget} currentPrice={pos.currentPrice} liveOk={liveOk} />
        {(() => {
          const _e = smaData?.find((d: Sma200Data) => d.ticker === pos.ticker) ?? null
          const _dot: string = _e ? (_e.above ? '#2d6a3f' : '#c0392b') : '#cccccc'
          return _e ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 5, marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#888888' }}>200d</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: _dot, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: _dot }}>{_e.above ? 'Over' : 'Under'}</span>
              <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#aaaaaa', marginLeft: 6 }}>Kurs: {_e.currentPrice} · 200d: {_e.sma200}</span>
            </div>
          ) : null
        })()}
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
  const inp = { width: '100%', background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, padding: '8px 12px', color: '#111111', fontFamily: 'var(--font-dm-mono)', fontSize: 12, outline: 'none' }
  const lbl = { fontSize: 10, color: '#999999', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, display: 'block', fontFamily: 'var(--font-dm-mono)' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 600 }}>Rediger {pos.ticker}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999999', cursor: 'pointer', fontSize: 20 }}>✕</button>
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
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.08)', color: '#999999', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>Annuller</button>
          <button onClick={() => onSave({ ...pos, currentPrice: parseFloat(currentPrice) || 0, stopLoss: parseFloat(stopLoss) || 0, exitTarget: parseFloat(exitTarget) || 0, invested: parseFloat(invested) || 0 })} style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.18)', color: '#666666', borderRadius: 6, padding: '10px 20px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: 'pointer' }}>Gem</button>
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
    <div style={{ background: past ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.09)', border: `1px solid ${past ? 'rgba(0,0,0,0.08)' : accent + '33'}`, borderRadius: 6, padding: '12px 14px', opacity: past ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, fontWeight: 700, color: isTbd ? '#999999' : '#111111', marginRight: 8 }}>{buy.ticker}</span>
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, color: '#444444' }}>{buy.name}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#ffffff', background: accent, borderRadius: 3, padding: '2px 6px' }}>{buy.category.toUpperCase()}</span>
      </div>
      {buy.price && (
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#555555', marginBottom: 4, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
          <span><span style={{ color: '#999999' }}>Kurs </span>{buy.price}</span>
          {buy.stop && <span><span style={{ color: '#999999' }}>Stop </span>{buy.stop}</span>}
          {buy.exit && <span><span style={{ color: '#999999' }}>Exit </span>{buy.exit}</span>}
        </div>
      )}
      {buy.note && (
        <div style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: buy.note.includes('Extreme') ? '#8b1c1c' : buy.note.includes('Hold') ? '#8a6a00' : '#666666', marginBottom: 6 }}>{buy.note}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: '#999999' }}>{buy.amount.toLocaleString('da-DK')} {buy.currency}</span>
        <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 10, color: past ? '#666666' : accent }}>
          {isTbd ? buy.plannedMonth.slice(0,7) : past ? 'Gennemført' : days <= 45 ? `om ${days}d` : buy.plannedMonth.slice(0,7)}
        </span>
      </div>
    </div>
  )
}

/* ─── Donut Chart ────────────────────────────────────────────────────── */
interface DonutSlice { label: string; value: number; color: string }

function DonutChart({ slices, title }: { slices: DonutSlice[]; title: string }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  const r = 54; const cx = 70; const cy = 70
  const circ = 2 * Math.PI * r
  let cumPct = 0
  const segments = slices.map(d => {
    const pct = d.value / total
    const dash = pct * circ
    const offset = -cumPct * circ
    cumPct += pct
    return { ...d, dash, offset }
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 10, color: '#555555', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>{title}</div>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={22}
            strokeDasharray={`${s.dash} ${circ}`}
            strokeDashoffset={s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.3s' }}
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fill="#111111" fontSize="18" fontWeight="600">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#999999" fontSize="9">aktier</text>
      </svg>
      <div style={{ width: '100%', marginTop: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: '#555555', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 9, color: '#777777' }}>{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const LAG_SLICES: DonutSlice[] = [
  { label: 'Kerne', value: 5, color: '#1a1a1a' },
  { label: 'Vækst', value: 6, color: '#404040' },
  { label: 'Spekulativ', value: 2, color: '#606060' },
]
const LAND_SLICES: DonutSlice[] = [
  { label: 'Danmark', value: 5, color: '#777777' },
  { label: 'USA', value: 4, color: '#1a1a1a' },
  { label: 'Canada', value: 1, color: '#606060' },
  { label: 'Brasilien', value: 1, color: '#404040' },
  { label: 'Indien', value: 1, color: '#333333' },
  { label: 'Åben', value: 1, color: '#aaaaaa' },
]
const BRANCHE_SLICES: DonutSlice[] = [
  { label: 'Pharma', value: 1, color: '#1a1a1a' },
  { label: 'Høreapparater', value: 2, color: '#1a1a1a' },
  { label: 'Råvarer/Palmolie', value: 1, color: '#606060' },
  { label: 'Fintech/Bank EM', value: 1, color: '#404040' },
  { label: 'Datacentre', value: 1, color: '#333333' },
  { label: 'Uran/Energi', value: 1, color: '#777777' },
  { label: 'Logistik', value: 1, color: '#606060' },
  { label: 'Betalinger EM', value: 1, color: '#909090' },
  { label: 'AI netværk', value: 1, color: '#3d3d3d' },
  { label: 'AI strøm/Elinfra', value: 1, color: '#555555' },
  { label: 'Indien bank', value: 1, color: '#555555' },
  { label: 'Åben', value: 1, color: '#aaaaaa' },
]

interface TimelineStock {
  ticker: string; name: string; category: 'Kerne' | 'Vækst' | 'Spekulativ'
  bought: boolean; buyDate: string; reviewDate: string | null; note?: string
}
const TIMELINE: TimelineStock[] = [
  { ticker: 'NU',     name: 'NU Holdings',        category: 'Vækst',      bought: false, buyDate: '2026-04', reviewDate: '2028-04' },
  { ticker: 'DLO',    name: 'dLocal',             category: 'Spekulativ', bought: false, buyDate: '2026-04', reviewDate: '2027-04' },
  { ticker: 'DEMANT', name: 'Demant',             category: 'Vækst',      bought: false, buyDate: '2026-05', reviewDate: '2028-05', note: 'Afvent Q1 5. maj' },
  { ticker: 'EQIX',   name: 'Equinix',            category: 'Vækst',      bought: false, buyDate: '2026-06', reviewDate: '2029-06' },
  { ticker: 'CCJ',    name: 'Cameco',             category: 'Kerne',      bought: false, buyDate: '2026-07', reviewDate: '2029-07' },
  { ticker: 'DSV',    name: 'DSV',                category: 'Kerne',      bought: false, buyDate: '2026-08', reviewDate: '2031-08' },
  { ticker: 'CRDO',   name: 'Credo Technology',   category: 'Spekulativ', bought: false, buyDate: '2026-11', reviewDate: '2027-11' },
  { ticker: 'ETN',    name: 'Eaton',              category: 'Kerne',      bought: false, buyDate: '2026-11', reviewDate: '2031-11' },
  { ticker: 'IBN',    name: 'ICICI Bank',         category: 'Vækst',      bought: false, buyDate: '2026-12', reviewDate: '2028-12' },
  { ticker: '??',     name: 'Åben',               category: 'Vækst',      bought: false, buyDate: '2027-01', reviewDate: null },
]

interface BuyPlan {
  ticker: string; buyMonth: string; priceNow: string; stop: string; exit: string
  currency: string; status: string; statusColor: string
}
const BUY_PLAN: BuyPlan[] = [
  { ticker: 'NU',     buyMonth: 'Apr 2026', priceNow: '$13,89',      stop: '$10,50',  exit: '$22',       currency: 'USD', status: 'Rotationskøb — Extreme Fear', statusColor: '#2d6a3f' },
  { ticker: 'DLO',    buyMonth: 'Apr 2026', priceNow: '$11,45',      stop: '$8,50',   exit: '$20',       currency: 'USD', status: 'Rotationskøb — Extreme Fear', statusColor: '#2d6a3f' },
  { ticker: 'DEMANT', buyMonth: 'Maj 2026', priceNow: '~187 DKK',    stop: '155 DKK', exit: '280 DKK',   currency: 'DKK', status: 'Afvent Q1 5. maj',            statusColor: '#8a6a00' },
  { ticker: 'EQIX',   buyMonth: 'Jun 2026', priceNow: '~$974',       stop: '$760',    exit: '$1.300',    currency: 'USD', status: 'OK',                          statusColor: '#2d6a3f' },
  { ticker: 'CCJ',    buyMonth: 'Jul 2026', priceNow: '$110',         stop: '$82',     exit: '$165',      currency: 'USD', status: 'OK',                          statusColor: '#2d6a3f' },
  { ticker: 'DSV',    buyMonth: 'Aug 2026', priceNow: '~1.588 DKK',  stop: '950 DKK', exit: '2.000 DKK', currency: 'DKK', status: 'OK',                          statusColor: '#2d6a3f' },
  { ticker: 'CRDO',   buyMonth: 'Nov 2026', priceNow: '~$102',        stop: '$80',     exit: '$160',      currency: 'USD', status: 'Hold øje — nær stop',         statusColor: '#8b1c1c' },
  { ticker: 'ETN',    buyMonth: 'Nov 2026', priceNow: '~$360',        stop: '$275',    exit: '$480',      currency: 'USD', status: 'OK',                          statusColor: '#2d6a3f' },
  { ticker: 'IBN',    buyMonth: 'Dec 2026', priceNow: '~$26,80',      stop: '$21',     exit: '$45',       currency: 'USD', status: 'OK — Indien',                 statusColor: '#2d6a3f' },
  { ticker: '??',     buyMonth: 'Jan 2027', priceNow: '—',            stop: '—',       exit: '—',         currency: '',    status: 'Åben',                        statusColor: '#999999' },
]


/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function PortefoeljePage() {
  const [positions, setPositions] = useState<ActivePosition[]>([])
  const [editPos, setEditPos] = useState<ActivePosition | null>(null)
  const [loading, setLoading] = useState(false)
  const [kursError, setKursError] = useState<string|null>(null)

  const [mkt, setMkt] = useState<{fg:number,fgLabel:string,sp:number,spHigh:number,sahm:number,pmi:number,peakDate:string,weeksSincePeak:number}|null>(null)
  const [mktLoading, setMktLoading] = useState(false)
  const [rotInBuyDate, setRotInBuyDate] = useState<string|null>(null)
  const [rotInBuyFG, setRotInBuyFG] = useState<number|null>(null)
  const [quotesOk, setQuotesOk] = useState<Record<string,boolean>>({})

  async function fetchMarket() {
    setMktLoading(true)
    try {
      const r = await fetch('/api/data')
      const j = await r.json()
      const peakDate = (j.sp500PeakDate as string) ?? ''
        const weeksSincePeak = peakDate ? Math.floor((Date.now() - new Date(peakDate).getTime()) / (1000*60*60*24*7)) : 99
        setMkt({ fg: j.fearGreedIndex as number, fgLabel: j.fearGreedLabel as string, sp: j.sp500Price as number, spHigh: j.sp500_52wHigh as number, sahm: j.sahmRule as number, pmi: 49.8, peakDate, weeksSincePeak })
    } catch { /* noop */ }
    setMktLoading(false)
  }

  const [sma200Data, setSma200Data] = useState<Sma200Data[]|null>(null)
  const [sma200Loading, setSma200Loading] = useState(false)

  async function fetchSMA200() {
    setSma200Loading(true)
    try {
      const r = await fetch('/api/sma200?tickers=NOVO-B,GN,UIE,NU,DLO,DEMANT,EQIX,CCJ,DSV,CRDO,ETN,IBN')
      const j = await r.json()
      if (Array.isArray(j)) setSma200Data(j as Sma200Data[])
    } catch { /* noop */ }
    setSma200Loading(false)
  }

    useEffect(() => { void fetchMarket(); void fetchSMA200() }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setPositions(saved ? JSON.parse(saved) : INITIAL_POSITIONS)
  }, [])

  useEffect(() => {
    const d = localStorage.getItem('rot_in_date')
    const fg = localStorage.getItem('rot_in_fg')
    if (d) setRotInBuyDate(d)
    if (fg) setRotInBuyFG(Number(fg))
  }, [])

  function persist(next: ActivePosition[]) {
    setPositions(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function registerRotIn() {
    if (!mkt) return
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('rot_in_date', today)
    localStorage.setItem('rot_in_fg', String(mkt.fg))
    setRotInBuyDate(today)
    setRotInBuyFG(mkt.fg)
  }

  function fmtDanish(iso: string): string {
    const d = new Date(iso)
    const m = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december']
    return `${d.getDate()}. ${m[d.getMonth()]} ${d.getFullYear()}`
  }

  function handleSave(p: ActivePosition) {
    persist(positions.map(x => x.id === p.id ? p : x))
    setEditPos(null)
  }

  function toYahooTicker(ticker: string): string {
    const dk = ['NOVO-B','GN','UIE','DSV','DEMANT','COLO-B','ORSTED','TRYG','NSIS-B']
    return dk.includes(ticker) ? ticker + '.CO' : ticker
  }

  async function fetchKurser() {
    setLoading(true)
    setKursError(null)
    try {
      const tickers = positions.map((p: ActivePosition) => toYahooTicker(p.ticker)).join(',')
      const [res, qRes] = await Promise.all([
        fetch('/api/portefolje-kurser'),
        fetch('/api/quotes?tickers=' + tickers)
      ])
      const data = await res.json()
      const quotes: Record<string,number|null> = qRes.ok ? await qRes.json() : {}
      if (data.error) throw new Error(data.error)
      const ok: Record<string,boolean> = {}
      const updated = positions.map((p: ActivePosition) => {
        const found = data.stocks?.find((s: {ticker: string; price: number}) => s.ticker === p.ticker)
        const yTicker = toYahooTicker(p.ticker)
        const lp = quotes[yTicker]
        ok[p.ticker] = typeof lp === 'number'
        const price = typeof lp === 'number' ? lp : (found ? found.price : p.currentPrice)
        return { ...p, currentPrice: price }
      })
      setQuotesOk(ok)
      persist(updated)
    } catch (e) {
      setKursError(e instanceof Error ? e.message.slice(0, 80) : 'Fejl ved hentning')
    } finally {
      setLoading(false)
    }
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
    <div style={{ minHeight: '100vh', background: '#e9e5da' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#111111', letterSpacing: '0.12em', marginBottom: 8 }}>◈ MIN PORTFOLIO</div>
            <div style={{ marginBottom: 6 }}>
              <h1 style={{ fontFamily: corm, fontSize: 42, fontWeight: 600, color: '#111111', margin: 0, lineHeight: 1.1 }}>
                Enkeltaktier <em>Langsigtet</em>
              </h1>
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: '#999999' }}>
              20 aktier · 1 køb om måneden · Fuldt investeret januar 2028
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 8 }}>
            <button onClick={fetchKurser} disabled={loading} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,0,0,0.08)', color: loading ? '#999999' : '#555555', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-dm-mono)', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.06em' }}>
              {loading ? '↻ Henter…' : '↻ Opdater kurser'}
            </button>
            {kursError && <div style={{ fontSize: 9, color: '#8b1c1c', maxWidth: 220, textAlign: 'right' }}>{kursError}</div>}
          </div>
        </div>

        {/* ── Markedsstemning ────────────────────────────────────────────────────── */}
        {((): ReactNode => {
          if (!mkt) return <div style={{ fontFamily: mono, fontSize: 10, color: '#999999', marginBottom: 20 }}>Henter markedsdata...</div>

          const spPct = (mkt.sp - mkt.spHigh) / mkt.spHigh * 100

          // ── ROTATION IND ──────────────────────────────────────────────────────
          const cooldownInTarget = rotInBuyFG !== null ? rotInBuyFG + 15 : null
          const cooldownInActive = cooldownInTarget !== null && mkt.fg < cooldownInTarget
          const cooldownInLifted = cooldownInTarget !== null && mkt.fg >= cooldownInTarget
          const in1 = mkt.fg < 25
          const in2 = spPct <= -7
          const nuEntry = sma200Data?.find((d: Sma200Data) => d.ticker === 'NU')
          const in3 = nuEntry?.above ?? false
          const scoreIn = [in1, in2, in3].filter(Boolean).length
          const godkendtInd = !cooldownInActive && scoreIn >= 2

          // ── ROTATION UD ───────────────────────────────────────────────────────
          const LAST_ROT_OUT_FG: number | null = null
          const out1 = mkt.fg > 75
          const out2 = spPct > -5
          const out3 = positions.some((p: ActivePosition) =>
            p.currentPrice > 0 && p.exitTarget > 0 && p.currentPrice >= p.exitTarget * 0.85)
          const scoreOut = [out1, out2, out3].filter(Boolean).length
          type CooldownStatus = 'ingen' | 'aktiv' | 'opfyldt'
          let cooldownOutStatus: CooldownStatus = 'ingen'
          if (LAST_ROT_OUT_FG !== null) {
            cooldownOutStatus = mkt.fg <= LAST_ROT_OUT_FG - 15 ? 'opfyldt' : 'aktiv'
          }
          const godkendtUd = cooldownOutStatus !== 'aktiv' && scoreOut >= 2

          const dot = (ok: boolean) => <span style={{ color: ok ? '#4a7c59' : '#a63d2f', fontSize: 8, marginRight: 4, flexShrink: 0 as const }}>●</span>
          const val = (ok: boolean, txt: string) => <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700 as const, color: ok ? '#2d6a3f' : '#8b1c1c' }}>{txt}</span>
          const fadeInd = mkt.fg > 56 || (mkt.fg >= 45 && mkt.fg <= 55)
          const fadeUd = mkt.fg < 44 || (mkt.fg >= 45 && mkt.fg <= 55)
          const fadeIndMsg = mkt.fg >= 45 && mkt.fg <= 55 ? 'neutralt' : 'for grådig'
          const fadeUdMsg = mkt.fg >= 45 && mkt.fg <= 55 ? 'neutralt' : 'for frygteligt'
          const colStyle: React.CSSProperties = { flex: 1, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 6, padding: '12px 14px' }
          const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }
          const labelStyle: React.CSSProperties = { fontFamily: mono, fontSize: 9, color: '#555555', flex: 1 }

          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>

                {/* ROTATION IND */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                <div style={{ ...colStyle, flex: 'none' as const, opacity: fadeInd ? 0.3 : 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: '#333333', marginBottom: 10, textTransform: 'uppercase' as const }}>Rotation ind</div>
                  <div style={rowStyle}>
                    {dot(in1)}<span style={labelStyle}>F&amp;G under 25</span>{val(in1, String(mkt.fg))}
                  </div>
                  <div style={rowStyle}>
                    {dot(in2)}<span style={labelStyle}>S&amp;P faldet 7%+</span>{val(in2, spPct.toFixed(1) + '%')}
                  </div>
                  {rotInBuyFG === null ? (
                    godkendtInd ? (
                      <button onClick={registerRotIn} style={{ fontFamily: mono, fontSize: 9, background: '#2d6a3f', color: '#ffffff', border: 'none', borderRadius: 3, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.04em', marginTop: 8 }}>Registrer rotationskøb</button>
                    ) : null
                  ) : cooldownInActive ? (
                    <div style={{ fontFamily: mono, fontSize: 8, color: '#8b1c1c', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 6, lineHeight: '1.6' }}>
                      Cooldown aktiv — F&G skal stige fra {rotInBuyFG} til mindst {cooldownInTarget}<br/>
                      Sidst roteret: {fmtDanish(rotInBuyDate ?? '')}
                    </div>
                  ) : (
                    <div style={{ fontFamily: mono, fontSize: 8, color: '#2d6a3f', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 6, lineHeight: '1.6' }}>
                      Cooldown opfyldt — F&G er over {(cooldownInTarget ?? 0) - 1}<br/>
                      Klar til ny rotation
                    </div>
                  )}
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: godkendtInd ? '#2d6a3f' : '#8b1c1c', marginTop: 6 }}>
                    {godkendtInd ? 'GODKENDT ●' : 'IKKE GODKENDT ●'}
                  </div>
                </div>
                </div>

                {/* ROTATION UD */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                <div style={{ ...colStyle, flex: 'none' as const, opacity: fadeUd ? 0.3 : 1 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', color: '#333333', marginBottom: 10, textTransform: 'uppercase' as const }}>Rotation ud</div>
                  <div style={rowStyle}>
                    {dot(out1)}<span style={labelStyle}>F&amp;G over 75</span>{val(out1, String(mkt.fg))}
                  </div>
                  <div style={rowStyle}>
                    {dot(out2)}<span style={labelStyle}>S&amp;P under 5% fra ATH</span>{val(out2, spPct.toFixed(1) + '%')}
                  </div>
                  <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    {dot(out3)}<span style={labelStyle}>Aktie nær exit mål</span>{val(out3, out3 ? 'Ja' : 'Nej')}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: cooldownOutStatus === 'aktiv' ? '#8b1c1c' : '#777777', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 6 }}>
                    {cooldownOutStatus === 'ingen' ? 'Ingen aktiv cooldown' : cooldownOutStatus === 'aktiv' ? 'Cooldown aktiv — F&G skal falde 15 point' : 'Cooldown opfyldt'}
                  </div>
                </div>
                </div>

              </div>
              {/* Meta */}
              <div style={{ fontFamily: mono, fontSize: 9, color: '#777777', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                <span>Brugt: 1/3</span>
                <span style={{ color: '#aaaaaa' }}>·</span>
                <span>Max 3/år</span>
                <span style={{ color: '#aaaaaa' }}>·</span>
                <span>Sidst: Apr 2026</span>
                <button onClick={() => { void fetchMarket(); void fetchSMA200() }} disabled={mktLoading || sma200Loading} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#666666' }}>Opdater</button>
              </div>
            </div>
          )
        })()}

        {/* ── SEKTION 1: Overblik ──────────────────────────────────────── */}
        <div style={{ background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '22px 24px', marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 18 }}>PORTFOLIOOVERBLIK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Aktive positioner', value: `${usedSlots}/20`, sub: `${20 - usedSlots} åbne pladser` },
              { label: 'Investeret', value: `${totalInvested.toLocaleString('da-DK')} DKK`, sub: 'Fri kapital' },
              { label: 'Kandidater i pulje', value: '17', sub: 'klar til køb' },
              { label: 'Åbne pladser', value: `${20 - usedSlots}`, sub: 'af 20 i alt' },
            ].map(({ label, value, sub }) => (
              <div key={label}>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.08em', marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: corm, fontSize: 24, fontWeight: 600, color: '#111111', lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(usedSlots / 20) * 100}%`, background: 'linear-gradient(90deg, #111111, #444444)' }} />
            </div>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', marginTop: 4 }}>{usedSlots} af 20 pladser fyldt</div>
          </div>

          {/* Sub-categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Kerne', filled: kerne, total: 6, color: '#111111' },
              { label: 'Vækst', filled: vaekst, total: 9, color: '#2d6a3f' },
              { label: 'Spekulativ', filled: spek, total: 5, color: '#8a6a00' },
            ].map(({ label, filled, total, color }) => (
              <div key={label} style={{ background: color + '10', border: '1px solid ' + color + '25', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color, letterSpacing: '0.08em', marginBottom: 4 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: corm, fontSize: 18, fontWeight: 600, color: '#111111' }}>{filled}/{total}</div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.10)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${(filled / total) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SEKTION: Fordeling ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 12 }}>FORDELING</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Land/Region */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: '#aaaaaa', marginBottom: 10 }}>LAND / REGION</div>
              {([
                { label: 'USA',      pct: 40 },
                { label: 'Danmark',  pct: 30 },
                { label: 'Canada',   pct: 10 },
                { label: 'Brasilien',pct:  5 },
                { label: 'Indien',   pct:  5 },
                { label: 'UK',       pct:  5 },
                { label: 'Korea',    pct:  5 },
              ] as { label: string; pct: number }[]).map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#555555', width: 60, flexShrink: 0 }}>{r.label}</div>
                  <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: r.pct + '%', height: '100%', background: '#4a7c59', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#999999', width: 26, textAlign: 'right' as const }}>{r.pct}%</div>
                </div>
              ))}
            </div>
            {/* Branche */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: '#aaaaaa', marginBottom: 10 }}>BRANCHE</div>
              {([
                { label: 'Uran/Energi',       pct: 20 },
                { label: 'AI/Halvledere',      pct: 10 },
                { label: 'Guld/Råvarer',       pct: 10 },
                { label: 'Høreapparater',      pct: 10 },
                { label: 'Fintech/Bet. EM',    pct: 10 },
                { label: 'Pharma',             pct:  5 },
                { label: 'Logistik',           pct:  5 },
                { label: 'Datacentre',         pct:  5 },
                { label: 'Infrastruktur',      pct:  5 },
                { label: 'Indien/Bank',        pct:  5 },
                { label: 'Palmolie',           pct:  5 },
                { label: 'Tech/IT',            pct:  5 },
                { label: 'Elektronik',         pct:  5 },
              ] as { label: string; pct: number }[]).map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#555555', width: 82, flexShrink: 0 }}>{r.label}</div>
                  <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: r.pct + '%', height: '100%', background: '#4a7c59', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#999999', width: 26, textAlign: 'right' as const }}>{r.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SEKTION 2: Aktive Positioner ───────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 16 }}>AKTIVE POSITIONER — {usedSlots}/20</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {positions.map(pos => {
              const _k = pos.category === 'Kerne'
              const _v = pos.category === 'Vækst'
              const cc = _k ? '#111111' : _v ? '#60a5fa' : '#fbbf24'
              const bg = _k ? 'rgba(17,17,17,0.07)' : _v ? 'rgba(96,165,250,0.07)' : 'rgba(251,191,36,0.07)'
              const smaE = sma200Data?.find(d => d.ticker === pos.ticker) ?? null
              const dot = smaE ? (smaE.above ? '#111111' : '#ef4444') : '#555'
              const dStop = pos.currentPrice > 0 ? (pos.currentPrice - pos.stopLoss) / pos.currentPrice * 100 : null
              const dExit = pos.currentPrice > 0 ? (pos.exitTarget - pos.currentPrice) / pos.currentPrice * 100 : null
              return (
                <div key={pos.id} style={{ background: bg, border: '1px solid ' + cc + '33', borderRadius: 8, padding: '10px 12px', position: 'relative' }}>
                  <button onClick={() => setEditPos(pos)} title="Rediger" style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 0 }}>{'✏'}</button>
                  <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: cc, marginBottom: 2 }}>{pos.ticker}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#aaa', marginBottom: 5 }}>{pos.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: cc, background: cc + '18', border: '1px solid ' + cc + '33', borderRadius: 3, display: 'inline-block', padding: '1px 5px', letterSpacing: '0.06em', marginBottom: 6 }}>{pos.category.toUpperCase()}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#777', marginBottom: 4 }}>▼ {pos.stopLoss} · ▲ {pos.exitTarget}</div>
                  {pos.currentPrice > 0 && (
                    <div style={{ fontFamily: mono, fontSize: 11, color: '#e9e5da', fontWeight: 600, marginBottom: 3 }}>{pos.currentPrice.toLocaleString('da-DK')}</div>
                  )}
                  {dStop !== null && dExit !== null && (
                    <div style={{ fontFamily: mono, fontSize: 8, display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: dStop < 12 ? '#ef4444' : '#888888' }}>▼ {dStop.toFixed(1)}%</span>
                      <span style={{ color: '#111111' }}>▲ +{dExit.toFixed(1)}%</span>
                    </div>
                  )}
                  {smaE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: mono, fontSize: 8, color: dot }}>200d {smaE.above ? 'over' : 'under'}</span>
                    </div>
                  )}
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#555555', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 5 }}>{pos.invested.toLocaleString('da-DK')} DKK</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SEKTION 3: Næste Køb & Kandidatpulje ───────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 12 }}>NÆSTE KØB — 1. APRIL</div>
          <div style={{ border: '2px dashed rgba(255,255,255,0.20)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 22, color: '#666' }}>?</div>
            <div>
              <div style={{ fontFamily: corm, fontSize: 26, fontWeight: 600, color: '#e9e5da', letterSpacing: '0.02em', lineHeight: 1 }}>TBD</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: '#888', marginTop: 4, letterSpacing: '0.06em' }}>Vælges den 1. april — fra kandidatpuljen nedenfor</div>
            </div>
          </div>
        </div>
        {/* Kandidatpulje */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 20 }}>KANDIDATPULJE — 17 AKTIER</div>

          {/* Kerne */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#111111', letterSpacing: '0.1em', marginBottom: 8 }}>KERNE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {[
                { ticker: 'NVDA', name: 'Nvidia', stop: 80, exit: 200 },
                { ticker: 'CCJ', name: 'Cameco', stop: 40, exit: 80 },
                { ticker: 'DSV', name: 'DSV A/S', stop: 900, exit: 1800 },
                { ticker: 'ETN', name: 'Eaton Corp', stop: 270, exit: 450 },
                { ticker: 'EQIX', name: 'Equinix', stop: 650, exit: 1100 },
                { ticker: 'SMSN', name: 'Samsung', stop: 55000, exit: 85000 },
              ].map(s => (
                <div key={s.ticker} style={{ background: 'rgba(17,17,17,0.07)', border: '1px solid rgba(17,17,17,0.20)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#111111', marginBottom: 2 }}>{s.ticker}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#aaa', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#777' }}>▼ {s.stop} · ▲ {s.exit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vækst */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#60a5fa', letterSpacing: '0.1em', marginBottom: 8 }}>VÆKST</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {[
                { ticker: 'NU', name: 'Nu Holdings', stop: 10, exit: 22 },
                { ticker: 'DEMANT', name: 'Demant', stop: 220, exit: 420 },
                { ticker: 'IBN', name: 'ICICI Bank', stop: 22, exit: 40 },
                { ticker: 'NXE', name: 'NexGen Energy', stop: 6, exit: 14 },
                { ticker: 'GOLD', name: 'Barrick Gold', stop: 14, exit: 28 },
              ].map(s => (
                <div key={s.ticker} style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.20)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>{s.ticker}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#aaa', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#777' }}>▼ {s.stop} · ▲ {s.exit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Spekulativ */}
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#fbbf24', letterSpacing: '0.1em', marginBottom: 8 }}>SPEKULATIV</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {[
                { ticker: 'DLO', name: 'dLocal', stop: 10, exit: 25 },
                { ticker: 'CRDO', name: 'Credo Technology', stop: 25, exit: 60 },
                { ticker: 'UUUU', name: 'Energy Fuels', stop: 3, exit: 8 },
                { ticker: 'YCA', name: 'Yellow Cake', stop: 3.5, exit: 7 },
                { ticker: 'METC', name: 'Ramaco Resources', stop: 10, exit: 25 },
                { ticker: 'ONDS', name: 'Ondas Holdings', stop: 1.5, exit: 5 },
              ].map(s => (
                <div key={s.ticker} style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.20)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 2 }}>{s.ticker}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#aaa', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#777' }}>▼ {s.stop} · ▲ {s.exit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Rotationsregler */}
        <div style={{ background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '22px 24px', marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 18 }}>ROTATIONSREGLER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { n: '01', rule: 'Månedligt køb', desc: 'Én ny position åbnes den 1. i måneden fra kandidatpuljen' },
              { n: '02', rule: 'Rotation ind', desc: 'Ny kandidat tilføjes puljen når en position lukkes' },
              { n: '03', rule: 'Rotation ud', desc: 'Position lukkes ved stop loss eller exit mål ramt' },
              { n: '04', rule: 'Lagbegrænsning', desc: 'Max 8 Kerne · max 8 Vækst · max 4 Spekulativ ad gangen' },
            ].map(r => (
              <div key={r.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: '#555', minWidth: 20, paddingTop: 1 }}>{r.n}</div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: '#cccccc', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>{r.rule}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#888888', lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Reglerne */}
          <div style={{ background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 16 }}>REGLERNE</div>
            {[
              { emoji: '🔴', title: 'Stop loss er hellig', body: 'Alarm udløser = sælg inden 24 timer. Ingen undtagelser.' },
              { emoji: '🟡', title: 'Ingen beslutninger på røde dage', body: 'Markedet falder voldsomt = vent 48 timer.' },
              { emoji: '🔵', title: 'Max 20 enkeltaktier', body: 'Vil du købe nummer 21 skal du sælge én af de 20 først.' },
            ].map(({ emoji, title, body }) => (
              <div key={title} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: corm, fontSize: 15, fontWeight: 600, color: '#111111', marginBottom: 3 }}>{emoji} {title}</div>
                <div style={{ fontFamily: corm, fontStyle: 'italic', fontSize: 13, color: '#777777', lineHeight: 1.5 }}>{body}</div>
              </div>
            ))}
          </div>

          {/* Ved markedskrak */}
          <div style={{ background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 16 }}>VED MARKEDSKRAK</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: mono, fontSize: 9, color: '#999999', textAlign: 'left', paddingBottom: 10, letterSpacing: '0.06em' }}>FALD</th>
                  <th style={{ fontFamily: mono, fontSize: 9, color: '#999999', textAlign: 'left', paddingBottom: 10, letterSpacing: '0.06em' }}>HANDLING</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { fald: 'Under 5% på én dag', handling: 'Vent 48 timer' },
                  { fald: 'Over 20% fra toppunkt', handling: 'Sælg ved stop loss — bliv i cash' },
                  { fald: 'Op 15% fra bund', handling: 'Køb ind igen' },
                ].map(({ fald, handling }) => (
                  <tr key={fald} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ fontFamily: corm, fontStyle: 'italic', fontSize: 13, color: '#777777', padding: '9px 0', paddingRight: 16, lineHeight: 1.4 }}>{fald}</td>
                    <td style={{ fontFamily: corm, fontSize: 13, color: '#555555', padding: '9px 0', lineHeight: 1.4 }}>{handling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        

        {/* Footer */}
        <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.06em', paddingBottom: 40 }}>
          NORDNET · FRIE MIDLER DEPOT · IKKE FINANSIEL RÅDGIVNING
        </div>
      </div>

      {/* Edit Modal */}
      {editPos && <EditModal pos={editPos} onClose={() => setEditPos(null)} onSave={handleSave} />}
    </div>
  )
}
