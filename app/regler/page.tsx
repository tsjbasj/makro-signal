'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

/* ─── Types ─────────────────────────────────────────────────────────── */
type LayerId = 'kerne' | 'vaekst' | 'spekulativ' | 'run2026'

interface Layer {
  id: LayerId
  label: string
  accent: string
  rule: string
  hard: string[]
  soft: string[]
  reconsider: string[]
}

/* ─── Sælge-framework data ──────────────────────────────────────────── */
const LAYERS: Layer[] = [
  {
    id: 'kerne',
    label: 'Kerne',
    accent: '#4a7c59',
    rule: 'Sælg kun hvis hård regel ELLER 3 af bløde signaler',
    hard: [
      'Stop loss nået (absolut bundniveau)',
      'Kernefortælling fundamentalt brudt',
      'Makro-rotation udløser (F&G under 25 + S&P −7%)',
    ],
    soft: [
      'Trailing stop 30% udløst',
      'Under 200-dages glidende gennemsnit',
      'Indtjening skuffer 3 kvartaler i træk',
      'CEO/ledelse forlader pludseligt',
      'Exit mål nået',
    ],
    reconsider: [
      'Ikke bevæget sig i 18 måneder',
    ],
  },
  {
    id: 'vaekst',
    label: 'Vækst',
    accent: '#2d6a9f',
    rule: 'Sælg hvis hård regel ELLER 2 af bløde signaler',
    hard: [
      'Stop loss nået',
      'Kernefortælling brudt',
      'Makro-rotation udløser',
    ],
    soft: [
      'Trailing stop 20% udløst',
      'Under 200-dages glidende gennemsnit',
      'Indtjening skuffer 2 kvartaler i træk',
      'CEO/ledelse forlader pludseligt',
      'Exit mål nået',
    ],
    reconsider: [
      'Ikke bevæget sig i 12 måneder',
    ],
  },
  {
    id: 'spekulativ',
    label: 'Spekulativ',
    accent: '#c0392b',
    rule: 'Sælg hvis hård regel ELLER 1 blød signal',
    hard: [
      'Stop loss nået',
      'Kernefortælling brudt',
      'Makro-rotation udløser',
    ],
    soft: [
      'Trailing stop 15% udløst',
      'Under 200-dages glidende gennemsnit',
      'Indtjening skuffer 1 kvartal',
      'CEO/ledelse forlader pludseligt',
      'Exit mål nået',
    ],
    reconsider: [
      'Ikke bevæget sig i 6 måneder',
    ],
  },
  {
    id: 'run2026',
    label: 'The 2026 Run',
    accent: '#f59e0b',
    rule: 'Egne regler',
    hard: [
      'Stop loss nået',
      'Kernefortælling brudt',
      'Trailing stop 20% fra top udløst',
      'CELC sælges dagen efter FDA-beslutning 17. juli 2026',
    ],
    soft: [
      'Exit mål nået → tag stilling',
    ],
    reconsider: [],
  },
]

/* ─── Positions for alarm-opdatering ──────────────────────────────── */
interface AlarmPosition {
  ticker: string
  name: string
  layer: LayerId
  currency: 'DKK' | 'USD'
}

const ALARM_POSITIONS: AlarmPosition[] = [
  // The 2026 Run
  { ticker: 'PLTR',   name: 'Palantir',       layer: 'run2026',    currency: 'USD' },
  { ticker: 'CELC',   name: 'Celcuity',       layer: 'run2026',    currency: 'USD' },
  { ticker: 'CRWD',   name: 'CrowdStrike',    layer: 'run2026',    currency: 'USD' },
  // Enkeltaktier
  { ticker: 'NOVO-B', name: 'Novo Nordisk',   layer: 'kerne',      currency: 'DKK' },
  { ticker: 'GN',     name: 'GN Store Nord',  layer: 'vaekst',     currency: 'DKK' },
  { ticker: 'UIE',    name: 'UIE A/S',        layer: 'kerne',      currency: 'DKK' },
  { ticker: 'DLO',    name: 'dLocal',         layer: 'spekulativ', currency: 'USD' },
  { ticker: 'ETN',    name: 'Eaton',          layer: 'kerne',      currency: 'USD' },
]

// Trailing stop multipliers per lag
const TRAILING_STOP: Record<LayerId, number> = {
  kerne:      0.70, // -30%
  vaekst:     0.80, // -20%
  spekulativ: 0.85, // -15%
  run2026:    0.80, // -20%
}
const NEXT_TAG_MULT = 1.20  // +20%
const NEXT_EXIT_MULT = 1.35 // +35%

const LAYER_LABEL: Record<LayerId, string> = {
  kerne: 'Kerne',
  vaekst: 'Vækst',
  spekulativ: 'Spekulativ',
  run2026: 'The 2026 Run',
}
const LAYER_COLOR: Record<LayerId, string> = {
  kerne: '#4a7c59',
  vaekst: '#2d6a9f',
  spekulativ: '#c0392b',
  run2026: '#f59e0b',
}

/* Parse a number in Danish or English format ("1.234,50" or "1234.50" or "1,234.50") */
function parseLocaleNumber(raw: string): number {
  if (!raw) return 0
  let s = raw.trim().replace(/\s/g, '').replace(/[^\d.,\-]/g, '')
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) {
    // Last separator wins as decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) s = parts.join('')
  }
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}

function fmtMoney(amount: number, currency: 'DKK' | 'USD'): string {
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 100) / 100
  const formatted = rounded.toLocaleString('da-DK', {
    minimumFractionDigits: amount >= 100 ? 0 : 2,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  })
  return currency === 'USD' ? `$${formatted}` : `${formatted} kr`
}

interface AlarmHistoryEntry {
  date: string  // ISO
  price: number
  stop: number
  tag: number
  exit: number
}

const HISTORY_STORAGE_KEY = 'makro-signal:regler:alarm-history'

function loadHistory(): Record<string, AlarmHistoryEntry[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveHistory(history: Record<string, AlarmHistoryEntry[]>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    // quota / private mode
  }
}

/* ─── Navigation (matches øvrige sider) ────────────────────────────── */
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
      <Link href="/investeringer" style={linkBase}>Investeringsoversigt</Link>
      <Link href="/regler" style={linkActive}>Regler</Link>
    </nav>
  )
}


/* ─── Alarm modal ──────────────────────────────────────────────────── */
function AlarmModal({
  position,
  history,
  onClose,
  onSave,
}: {
  position: AlarmPosition
  history: AlarmHistoryEntry[]
  onClose: () => void
  onSave: (entry: AlarmHistoryEntry) => void
}) {
  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'
  const accent = LAYER_COLOR[position.layer]
  const layerLabel = LAYER_LABEL[position.layer]
  const stopMult = TRAILING_STOP[position.layer]
  const stopPct = Math.round((1 - stopMult) * 100)

  const [priceInput, setPriceInput] = useState('')
  const [computed, setComputed] = useState<{ price: number; stop: number; tag: number; exit: number } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const previousEntry = history[0]  // Most-recent entry, if any

  const handleCalculate = () => {
    const price = parseLocaleNumber(priceInput)
    if (!price || price <= 0) return
    const stop = price * stopMult
    const tag = price * NEXT_TAG_MULT
    const exit = price * NEXT_EXIT_MULT
    const result = { price, stop, tag, exit }
    setComputed(result)
    onSave({
      date: new Date().toISOString(),
      ...result,
    })
  }

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(k => k === key ? null : k), 1400)
    } catch {
      // clipboard may be blocked
    }
  }

  const alarmTexts = computed ? [
    {
      key: 'stop',
      label: 'Trailing stop',
      value: computed.stop,
      pct: `−${stopPct}%`,
      dot: '🔴',
      color: '#8b1c1c',
      bg: 'rgba(192, 57, 43, 0.08)',
      border: 'rgba(192, 57, 43, 0.25)',
      sub: 'sæt i Nordnet',
      text: `${position.ticker} trailing stop — sælg alt ved ${fmtMoney(computed.stop, position.currency)}`,
    },
    {
      key: 'tag',
      label: 'Næste tag stilling',
      value: computed.tag,
      pct: '+20% fra nu',
      dot: '🟠',
      color: '#8a5a00',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.30)',
      sub: 'tag stilling',
      text: `${position.ticker} tag stilling stigning — ${fmtMoney(computed.tag, position.currency)}`,
    },
    {
      key: 'exit',
      label: 'Næste exit mål',
      value: computed.exit,
      pct: '+35% fra nu',
      dot: '🟢',
      color: '#1f5a2f',
      bg: 'rgba(74, 124, 89, 0.10)',
      border: 'rgba(74, 124, 89, 0.30)',
      sub: 'exit mål',
      text: `${position.ticker} exit mål — ${fmtMoney(computed.exit, position.currency)}`,
    },
  ] : []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflow: 'auto',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#f2efe6',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ height: 3, background: accent }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
              <span style={{
                fontFamily: mono, fontSize: 9, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#777777',
              }}>
                Lag · {layerLabel}
              </span>
            </div>
            <h2 style={{
              fontFamily: corm, fontSize: 28, fontWeight: 600,
              color: '#111111', margin: 0, lineHeight: 1.1,
            }}>
              {position.name}
            </h2>
            <div style={{
              fontFamily: mono, fontSize: 11, color: '#777777',
              letterSpacing: '0.04em', marginTop: 4,
            }}>
              {position.ticker} · {position.currency}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Luk"
            style={{
              background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontFamily: mono, fontSize: 11, color: '#666666',
            }}
          >
            ✕ Luk
          </button>
        </div>

        {/* Input */}
        <div style={{ padding: '12px 24px 4px' }}>
          <label style={{
            display: 'block', fontFamily: mono, fontSize: 9,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#777777', marginBottom: 8,
          }}>
            Indtast aktuel kurs
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCalculate() }}
                placeholder={position.currency === 'USD' ? 'fx 580.50' : 'fx 231,95'}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 8,
                  padding: '12px 56px 12px 14px',
                  fontFamily: mono,
                  fontSize: 18,
                  color: '#111111',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: mono, fontSize: 11, color: '#999999',
                letterSpacing: '0.04em',
              }}>
                {position.currency}
              </span>
            </div>
            <button
              onClick={handleCalculate}
              style={{
                background: '#111111',
                color: '#f2efe6',
                border: 'none',
                borderRadius: 8,
                padding: '0 18px',
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Beregn alarmer
            </button>
          </div>
          <div style={{
            marginTop: 8, fontFamily: mono, fontSize: 10,
            color: '#888888', letterSpacing: '0.02em',
          }}>
            Trailing stop for {layerLabel}: −{stopPct}% fra aktuel kurs.
          </div>
        </div>

        {/* Results */}
        {computed && (
          <div style={{ padding: '18px 24px 4px' }}>
            <div style={{
              fontFamily: mono, fontSize: 9, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#777777', marginBottom: 12,
            }}>
              ── Nye alarmer for {position.ticker} ────────────
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: mono, fontSize: 11, color: '#444444',
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 6,
              marginBottom: 10,
            }}>
              <span style={{ letterSpacing: '0.04em' }}>Aktuel kurs</span>
              <span style={{ fontWeight: 500, color: '#111111' }}>
                {fmtMoney(computed.price, position.currency)}
              </span>
            </div>

            {alarmTexts.map((row) => (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: row.bg, border: `1px solid ${row.border}`,
                borderRadius: 8, padding: '10px 12px', marginBottom: 8,
              }}>
                <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>{row.dot}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: mono, fontSize: 9, letterSpacing: '0.10em',
                    textTransform: 'uppercase', color: row.color, fontWeight: 600,
                    marginBottom: 2,
                  }}>
                    {row.label}
                    <span style={{
                      color: '#999999', fontWeight: 400, marginLeft: 6,
                    }}>· {row.pct}</span>
                  </div>
                  <div style={{
                    fontFamily: corm, fontSize: 19, color: '#111111', lineHeight: 1.1,
                  }}>
                    {fmtMoney(row.value, position.currency)}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(row.text, row.key)}
                  title={row.text}
                  style={{
                    background: copiedKey === row.key ? row.color : 'rgba(255,255,255,0.6)',
                    color: copiedKey === row.key ? '#ffffff' : row.color,
                    border: `1px solid ${row.border}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontFamily: mono, fontSize: 9,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copiedKey === row.key ? '✓ Kopieret' : '⧉ Kopiér'}
                </button>
              </div>
            ))}

            {/* Copy block for Nordnet */}
            <div style={{
              marginTop: 12,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 8,
              padding: '12px 14px',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 8,
              }}>
                <div style={{
                  fontFamily: mono, fontSize: 9, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#666666',
                }}>
                  Nordnet alarm-tekst klar til copy
                </div>
                <button
                  onClick={() => handleCopy(alarmTexts.map(a => a.text).join('\n'), 'all')}
                  style={{
                    background: copiedKey === 'all' ? '#111111' : 'rgba(255,255,255,0.6)',
                    color: copiedKey === 'all' ? '#f2efe6' : '#444444',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontFamily: mono, fontSize: 9,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'all' ? '✓ Kopieret alle' : '⧉ Kopiér alle'}
                </button>
              </div>
              {alarmTexts.map((row) => (
                <div key={`txt-${row.key}`} style={{
                  fontFamily: mono, fontSize: 11, color: '#1a1a1a',
                  marginBottom: 4, fontStyle: 'italic',
                }}>
                  &ldquo;{row.text}&rdquo;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {previousEntry && (
          <div style={{
            margin: '16px 24px 0',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8,
            fontFamily: mono, fontSize: 10,
            color: '#666666',
            letterSpacing: '0.02em',
          }}>
            Seneste opdatering: {new Date(previousEntry.date).toLocaleString('da-DK', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            <span style={{ color: '#bbbbbb', margin: '0 6px' }}>·</span>
            Forrige stop: <span style={{ color: '#111111', fontWeight: 500 }}>
              {fmtMoney(previousEntry.stop, position.currency)}
            </span>
            <span style={{ color: '#bbbbbb', margin: '0 6px' }}>·</span>
            kurs {fmtMoney(previousEntry.price, position.currency)}
          </div>
        )}

        <div style={{ padding: '14px 24px 22px' }} />
      </div>
    </div>
  )
}

/* ─── Alarm sektion ────────────────────────────────────────────────── */
function AlarmSection() {
  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'

  const [selected, setSelected] = useState<AlarmPosition | null>(null)
  const [history, setHistory] = useState<Record<string, AlarmHistoryEntry[]>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
    setHydrated(true)
  }, [])

  const handleSave = useCallback((ticker: string, entry: AlarmHistoryEntry) => {
    setHistory(prev => {
      const next = { ...prev }
      next[ticker] = [entry, ...(prev[ticker] ?? [])].slice(0, 20)
      saveHistory(next)
      return next
    })
  }, [])

  // Group by lag
  const groups: { layer: LayerId; positions: AlarmPosition[] }[] = ([
    'run2026', 'kerne', 'vaekst', 'spekulativ',
  ] as LayerId[]).map(layer => ({
    layer,
    positions: ALARM_POSITIONS.filter(p => p.layer === layer),
  })).filter(g => g.positions.length > 0)

  return (
    <section style={{ marginTop: 44, marginBottom: 24 }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: mono, fontSize: 10, color: '#111111',
          letterSpacing: '0.12em', marginBottom: 6,
        }}>
          ◈ INTERAKTIV
        </div>
        <h2 style={{
          fontFamily: corm, fontSize: 32, fontWeight: 600,
          color: '#111111', margin: 0, lineHeight: 1.1,
        }}>
          Opdater <em style={{ fontStyle: 'italic', fontWeight: 500 }}>kursalarmer</em>
        </h2>
        <p style={{
          fontFamily: mono, fontSize: 11, color: '#666666',
          marginTop: 8, marginBottom: 0, letterSpacing: '0.02em',
          maxWidth: 720, lineHeight: 1.55,
        }}>
          Klik på en aktie, indtast aktuel kurs — få nyt trailing stop, tag-stilling og
          exit mål beregnet ud fra lagets regel.
        </p>
      </header>

      {groups.map(({ layer, positions }) => (
        <div key={layer} style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: mono, fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#666666', marginBottom: 10,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: LAYER_COLOR[layer],
            }} />
            {LAYER_LABEL[layer]}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10,
          }}>
            {positions.map(pos => {
              const last = hydrated ? history[pos.ticker]?.[0] : undefined
              return (
                <button
                  key={pos.ticker}
                  onClick={() => setSelected(pos)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(255,255,255,0.40)',
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderTop: `2px solid ${LAYER_COLOR[layer]}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease, background 0.12s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.65)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.40)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    fontFamily: mono, fontSize: 11, color: '#111111',
                    fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4,
                  }}>
                    {pos.ticker}
                  </div>
                  <div style={{
                    fontFamily: corm, fontSize: 17, color: '#1a1a1a', lineHeight: 1.15,
                  }}>
                    {pos.name}
                  </div>
                  <div style={{
                    marginTop: 8,
                    fontFamily: mono, fontSize: 9, color: '#999999',
                    letterSpacing: '0.04em',
                  }}>
                    {pos.currency}
                    {last && (
                      <>
                        <span style={{ color: '#cccccc', margin: '0 5px' }}>·</span>
                        stop {fmtMoney(last.stop, pos.currency)}
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {selected && (
        <AlarmModal
          position={selected}
          history={history[selected.ticker] ?? []}
          onClose={() => setSelected(null)}
          onSave={(entry) => handleSave(selected.ticker, entry)}
        />
      )}
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function ReglerPage() {
  const mono = 'var(--font-dm-mono)'

  return (
    <div style={{ minHeight: '100vh', background: '#e9e5da' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ─── Page Header ─── */}
        <header style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: mono,
            fontSize: 10,
            color: '#111111',
            letterSpacing: '0.12em',
          }}>
            ◈ REGLER
          </div>
        </header>

        {/* ─── Interaktiv alarm-opdatering ─── */}
        <AlarmSection />

        {/* ─── Forklaringsboks ─── */}
        <aside style={{
          marginTop: 12,
          padding: '20px 22px',
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 10,
        }}>
          <div style={{
            fontFamily: mono,
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#777777',
            marginBottom: 10,
          }}>
            Logik
          </div>
          <p style={{
            fontFamily: mono,
            fontSize: 11,
            color: '#1a1a1a',
            lineHeight: 1.7,
            margin: 0,
            letterSpacing: '0.01em',
          }}>
            Hårde regler udløser salg alene. Bløde signaler kræver det angivne antal
            før der handles. Genovervejelses-signaler er ingen handling — men aktiv
            opfølgning.
          </p>
        </aside>

        {/* ─── Footer ─── */}
        <footer style={{
          textAlign: 'center',
          fontFamily: mono,
          fontSize: 9,
          color: '#aaaaaa',
          lineHeight: 1.6,
          marginTop: 36,
        }}>
          Disciplineret salg · samme regler hver gang · Kun til informationsformål
        </footer>

      </div>
    </div>
  )
}
