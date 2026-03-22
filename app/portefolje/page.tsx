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
      <Link href="/portefolje" style={{ color: '#111111', textDecoration: 'none', borderBottom: '1px solid #111111', paddingBottom: 2 }}>Min Portefølje</Link>
      <Link href="/krisekob" style={{ color: '#999999', textDecoration: 'none' }}>Krisekøb ETF</Link>
    </nav>
  )
}

/* ─── Price Bar ──────────────────────────────────────────────────────── */
function PriceBar({ stopLoss, exitTarget, currentPrice }: { stopLoss: number; exitTarget: number; currentPrice: number }) {
  const pct = Math.max(0, Math.min(100, ((currentPrice - stopLoss) / (exitTarget - stopLoss)) * 100))
  const zone = pct < 30 ? '#8b1c1c' : pct < 70 ? '#8a6a00' : '#2d6a3f'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-dm-mono)', fontSize: 9, color: '#999999', marginBottom: 6 }}>
        <span>STOP {stopLoss}</span>
        <span style={{ color: zone, fontWeight: 500 }}>Kurs ~{currentPrice}</span>
        <span>MÅL {exitTarget}</span>
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
}: {
  pos: ActivePosition
  onEdit: (p: ActivePosition) => void
  onToggleCheck: (id: string) => void
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
          <div style={{ color: '#8b1c1c' }}>⬇ Sælg altid under: {pos.stopLoss} {pos.currency}</div>
          <div style={{ color: '#2d6a3f' }}>⬆ Tag gevinst ved: {pos.exitTarget} {pos.currency}</div>
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
  { ticker: 'NOVO-B', name: 'Novo Nordisk',      category: 'Kerne',      bought: true,  buyDate: '2026-03', reviewDate: '2031-03' },
  { ticker: 'GN',     name: 'GN Store Nord',     category: 'Vækst',      bought: true,  buyDate: '2026-03', reviewDate: '2028-03' },
  { ticker: 'UIE',    name: 'UIE A/S',            category: 'Kerne',      bought: true,  buyDate: '2026-03', reviewDate: '2029-03' },
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
      const r = await fetch('/api/sma200?tickers=NOVO-B,GN,UIE,NU')
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

  function persist(next: ActivePosition[]) {
    setPositions(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function handleSave(p: ActivePosition) {
    persist(positions.map(x => x.id === p.id ? p : x))
    setEditPos(null)
  }

  async function fetchKurser() {
    setLoading(true)
    setKursError(null)
    try {
      const res = await fetch('/api/portefolje-kurser')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const updated = positions.map((p: ActivePosition) => {
        const found = data.stocks?.find((s: {ticker: string; price: number}) => s.ticker === p.ticker)
        return found ? { ...p, currentPrice: found.price } : p
      })
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
            <div style={{ fontFamily: mono, fontSize: 10, color: '#111111', letterSpacing: '0.12em', marginBottom: 8 }}>◈ MIN PORTEFØLJE</div>
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

        {/* ── Markedsstemning ───────────────────────────────────────────── */}
        {((): ReactNode => {
          if (!mkt) return <div style={{ fontFamily: mono, fontSize: 10, color: '#999999', marginBottom: 20 }}>Henter markedsdata...</div>
          // Cooldown config (hardcoded)
          const LAST_ROT_FG = 16
          const COOLDOWN_TARGET = LAST_ROT_FG + 15
          const cooldownActive = mkt.fg < COOLDOWN_TARGET
          // 4 kriterier
          const criterion1 = mkt.fg < 25
          const spPct = (mkt.sp - mkt.spHigh) / mkt.spHigh * 100
          const criterion2 = spPct <= -5
          const criterion3 = mkt.weeksSincePeak < 6
          const nuEntry = sma200Data?.find(d => d.ticker === 'NU')
          const criterion4 = nuEntry?.above ?? false
          const score = [criterion1, criterion2, criterion3, criterion4].filter(Boolean).length
          const godkendt = !cooldownActive && score >= 2
          const badgeColor: string = godkendt ? '#2d6a3f' : '#8b1c1c'
          const checkMark = (ok: boolean) => ok ? '✅' : '❌'
          return (
            <div style={{ marginBottom: 16 }}>
              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' as const, gap: 8 }}>
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: badgeColor, border: '1px solid ' + badgeColor + '55', borderRadius: 3, padding: '4px 12px' }}>
                  ROTATION — {godkendt ? 'GODKENDT ✅' : 'IKKE GODKENDT ❌'}
                </div>
                {cooldownActive && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: '#8b1c1c' }}>
                    Cooldown aktiv — F&amp;G skal stige fra {mkt.fg} til mindst {COOLDOWN_TARGET}
                  </div>
                )}
              </div>
              {/* Criteria grid */}
              <div style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 6, padding: '10px 16px' }}>
                {/* Row 1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 12, width: 20 }}>{checkMark(criterion1)}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#444444', flex: 1 }}>F&amp;G under 25</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: criterion1 ? '#2d6a3f' : '#8b1c1c' }}>{mkt.fg} {mkt.fgLabel}</span>
                </div>
                {/* Row 2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 12, width: 20 }}>{checkMark(criterion2)}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#444444', flex: 1 }}>S&amp;P faldet 5%+</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: criterion2 ? '#2d6a3f' : '#8b1c1c' }}>{spPct.toFixed(1)}%</span>
                </div>
                {/* Row 3 — auto peak date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 12, width: 20 }}>{checkMark(criterion3)}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#444444', flex: 1 }}>Fald sket på under 6 uger</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: criterion3 ? '#2d6a3f' : '#8b1c1c' }}>
                    {mkt.peakDate ? `Toppede: ${new Date(mkt.peakDate).toLocaleDateString('da-DK',{day:'numeric',month:'short'})} · ${mkt.weeksSincePeak} uger siden` : '—'}
                  </span>
                </div>
                {/* Row 4 — 200d MA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                  <span style={{ fontSize: 12, width: 20 }}>{nuEntry ? checkMark(criterion4) : '—'}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#444444', flex: 1 }}>Næste aktie over 200d</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: criterion4 ? '#2d6a3f' : (nuEntry ? '#8b1c1c' : '#999999') }}>
                    {sma200Loading ? 'henter...' : nuEntry ? `NU — ${nuEntry.above ? 'over' : 'under'}` : '—'}
                  </span>
                </div>
              </div>
              {/* Meta row */}
              <div style={{ fontFamily: mono, fontSize: 9, color: '#777777', marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
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
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 18 }}>PORTEFØLJEOVERBLIK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Pladser brugt', value: `${usedSlots}/20`, sub: `${totalSlots - usedSlots} ledige` },
              { label: 'Investeret', value: `${totalInvested.toLocaleString('da-DK')} DKK`, sub: 'Fri kapital' },
              { label: 'Næste køb', value: nextBuy.ticker, sub: `${nextBuy.name} · ${fmtMonth(nextBuy.plannedMonth)}` },
              { label: 'Dage til næste', value: daysToNext > 0 ? `${daysToNext}d` : 'NU', sub: daysToNext <= 0 ? 'Klar til køb' : 'fra i dag' },
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

        {/* ── SEKTION 2: Aktive Positioner ─────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 16 }}>AKTIVE POSITIONER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {positions.map(pos => (
              <PositionCard key={pos.id} pos={pos} onEdit={setEditPos} onToggleCheck={toggleCheck} />
            ))}
          </div>
        </div>

        {/* ── TREND TJEK ─────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#111111' }}>TREND TJEK</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: '#999999', marginLeft: 10 }}>200-dages glidende gennemsnit</span>
            </div>
            <button onClick={() => { void fetchSMA200() }} disabled={sma200Loading} style={{ fontFamily: mono, fontSize: 9, background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 3, padding: '3px 9px', cursor: 'pointer', color: '#666666' }}>
              {sma200Loading ? 'Henter...' : 'Opdater'}
            </button>
          </div>
          {sma200Data ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
              {sma200Data.filter(d => ['NOVO-B','GN','UIE'].includes(d.ticker)).map(d => (
                <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: 12, width: 20 }}>{d.above ? '✅' : '❌'}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#111111', minWidth: 64 }}>{d.ticker}</span>
                  <span style={{ fontFamily: corm, fontSize: 13, color: '#444444', flex: 1 }}>{d.name}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: d.above ? '#2d6a3f' : '#8b1c1c', minWidth: 80, textAlign: 'right' as const }}>{d.above ? 'Over 200d' : 'Under 200d'}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: '#888888', minWidth: 160, textAlign: 'right' as const }}>Kurs: {d.currentPrice} · 200d: {d.sma200}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 10, color: '#999999' }}>{sma200Loading ? 'Henter data...' : 'Tryk Opdater for at hente data'}</div>
          )}
          <div style={{ fontFamily: corm, fontSize: 12, color: '#888888', marginTop: 10, fontStyle: 'italic' as const }}>
            Under 200-dages gennemsnit er ikke et salgssignal — men et advarselstegn. Stop loss gælder stadig altid.
          </div>
        </div>

        {/* ── SEKTION 3: Købeplan ──────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: '#999999', letterSpacing: '0.1em', marginBottom: 16 }}>KØBEPLAN · MAJ 2026 – JAN 2028</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {PLANNED_BUYS.map((buy, i) => (
              <PlannedCard key={i} buy={buy} />
            ))}
          </div>
        </div>

        {/* ── SEKTION 4 + 5 side om side ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

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
        </div>

        {/* ── SEKTION: Tidslinje ──────────────────────────────────── */}
        <div style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#111111', letterSpacing: '0.1em', marginBottom: 20 }}>TIDSLINJE</div>
          {TIMELINE.map((s) => {
            const now = new Date('2026-03-20')
            const buyD = new Date(s.buyDate + '-01')
            const revD = s.reviewDate ? new Date(s.reviewDate + '-01') : null
            const totalMs = revD ? revD.getTime() - buyD.getTime() : 1
            const elapsedMs = revD ? Math.max(0, now.getTime() - buyD.getTime()) : 0
            const pct = revD ? Math.min(100, (elapsedMs / totalMs) * 100) : 0
            const msLeft = revD ? revD.getTime() - now.getTime() : 0
            const monthsLeft = revD ? Math.max(0, Math.round(msLeft / (1000 * 60 * 60 * 24 * 30.5))) : 0
            const yearsLeft = Math.floor(monthsLeft / 12)
            const moLeft = monthsLeft % 12
            const barColor = monthsLeft > 12 ? '#2d6a3f' : monthsLeft > 6 ? '#8a6a00' : '#8b1c1c'
            const catColor = s.category === 'Kerne' ? '#1a1a1a' : s.category === 'Vækst' ? '#404040' : '#606060'
            // ── Udskiftningsalarm (kun for købte aktier) ──
            const ABUY: {[k:string]:number} = {'NOVO-B':241.5,'GN':98,'UIE':369.15}
            const AEXIT: {[k:string]:number} = {'NOVO-B':380,'GN':145,'UIE':500}
            const aBp = ABUY[s.ticker] ?? 0
            const aEg = AEXIT[s.ticker] ?? 0
            const aPos = (s.bought && aBp && aEg) ? positions.find(p => p.ticker === s.ticker) : null
            const aCp = aPos ? aPos.currentPrice : aBp
            const aProg = (aBp && aEg) ? Math.min(100, Math.max(0, (aCp - aBp) / (aEg - aBp) * 100)) : 0
            const aBuyDt = new Date(s.buyDate + '-01')
            const aNow2 = new Date('2026-03-20')
            const aMo = Math.max(0, (aNow2.getFullYear()-aBuyDt.getFullYear())*12+(aNow2.getMonth()-aBuyDt.getMonth()))
            const aFallen = s.bought && aBp ? aCp < aBp : false
            const aDot = !s.bought || !aBp ? '#2d6a3f' : (aFallen && aMo > 24 ? '#8b1c1c' : aProg < 25 && aMo > 18 ? '#8b1c1c' : aProg < 50 && aMo > 12 ? '#8a6a00' : '#2d6a3f')
            const aLabel = !s.bought || !aBp ? '' : (aFallen && aMo > 24 ? 'Udskift nu' : aProg < 25 && aMo > 18 ? 'Overvej udskiftning' : aProg < 50 && aMo > 12 ? 'Gennemgå snart' : 'På rette spor')
            const aPulse = s.bought && aBp ? (aFallen && aMo > 24) : false
            return (
              <div key={s.ticker} style={{ marginBottom: 16, opacity: s.bought ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 11, color: '#111111', fontWeight: 600, minWidth: 52 }}>{s.ticker}</span>
                    <span style={{ fontSize: 9, color: '#777777' }}>{s.name}</span>
                    <span style={{ fontSize: 8, color: catColor, background: catColor + '22', borderRadius: 3, padding: '1px 5px' }}>{s.category}</span>
                    {s.note && <span style={{ fontSize: 8, color: '#8a6a00' }}>{s.note}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#999999' }}>
                    <span>{s.buyDate}</span>
                    {s.reviewDate && <span style={{ color: '#999999' }}>→ {s.reviewDate}</span>}
                  </div>
                </div>
                <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                  {s.reviewDate && (
                    <div style={{ position: 'absolute', left: 0, width: pct + '%', height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
                  )}
                  {!s.reviewDate && (
                    <div style={{ position: 'absolute', left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.08)', borderRadius: 3 }} />
                  )}
                </div>
                {s.reviewDate && revD && (
                  <div style={{ fontSize: 8, color: '#999999', marginTop: 3 }}>
                    {s.bought
                      ? (yearsLeft > 0 ? `Genovervejes om ${yearsLeft} år og ${moLeft} måneder` : `Genovervejes om ${moLeft} måneder`)
                      : `Planlagt køb ${s.buyDate}`}
                  </div>
                )}
                {!s.reviewDate && <div style={{ fontSize: 8, color: '#999999', marginTop: 3 }}>Åben slot</div>}
                {s.bought && aBp > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.10)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: aDot, flexShrink: 0,
                        boxShadow: aPulse ? ('0 0 0 3px ' + aDot + '44') : 'none',
                        outline: aPulse ? ('2px solid ' + aDot) : 'none', outlineOffset: 2
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: aDot, letterSpacing: '0.02em' }}>{aLabel}</span>
                      <span style={{ fontSize: 10, color: '#999999', marginLeft: 'auto' }}>
                        {aCp.toFixed(0)} → {aEg} DKK · {Math.round(aProg)}% fremgang · {aMo} mdr.
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: aProg + '%', borderRadius: 2, background: aDot, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
