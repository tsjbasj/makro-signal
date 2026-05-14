import Link from 'next/link'

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

/* ─── Signal-blok (én sub-sektion: hård / blød / genovervej) ──────── */
function SignalBlock({
  kind,
  items,
}: {
  kind: 'hard' | 'soft' | 'reconsider'
  items: string[]
}) {
  if (items.length === 0) return null
  const cfg = {
    hard: {
      label: 'Hård regel',
      sub: 'udløser salg alene',
      emoji: '🔴',
      bg: 'rgba(192, 57, 43, 0.08)',
      border: 'rgba(192, 57, 43, 0.25)',
      accent: '#8b1c1c',
      dot: '#c0392b',
    },
    soft: {
      label: 'Blød signal',
      sub: 'tæller mod tærsklen',
      emoji: '🟠',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.30)',
      accent: '#8a5a00',
      dot: '#f59e0b',
    },
    reconsider: {
      label: 'Genovervej',
      sub: 'aktiv opfølgning, ingen handling',
      emoji: '🟡',
      bg: 'rgba(234, 179, 8, 0.10)',
      border: 'rgba(234, 179, 8, 0.30)',
      accent: '#7a5a00',
      dot: '#eab308',
    },
  }[kind]
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, lineHeight: 1 }} aria-hidden>{cfg.emoji}</span>
        <span style={{
          fontFamily: 'var(--font-dm-mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: cfg.accent,
        }}>
          {cfg.label}
        </span>
        <span style={{
          fontFamily: 'var(--font-dm-mono)',
          fontSize: 9,
          color: '#888888',
          letterSpacing: '0.04em',
        }}>
          · {cfg.sub}
        </span>
      </div>
      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 16,
            color: '#1a1a1a',
            lineHeight: 1.4,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: cfg.dot,
              marginTop: 8,
              flexShrink: 0,
            }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─── Lag-kort ──────────────────────────────────────────────────────── */
function LayerCard({ layer }: { layer: Layer }) {
  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'
  return (
    <article style={{
      background: 'rgba(255,255,255,0.30)',
      border: '1px solid rgba(0,0,0,0.10)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 22,
    }}>
      <div style={{ height: 3, background: layer.accent }} />
      <div style={{ padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: layer.accent,
              }} />
              <span style={{
                fontFamily: mono,
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#777777',
              }}>
                Lag · {layer.id === 'run2026' ? 'Specielt' : layer.id}
              </span>
            </div>
            <h2 style={{
              fontFamily: corm,
              fontSize: 30,
              fontWeight: 600,
              color: '#111111',
              margin: 0,
              lineHeight: 1.1,
            }}>
              {layer.label}
            </h2>
          </div>
          <div style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: '0.04em',
            color: layer.accent,
            background: 'rgba(0,0,0,0.04)',
            border: `1px solid ${layer.accent}33`,
            padding: '6px 10px',
            borderRadius: 6,
            maxWidth: 380,
          }}>
            {layer.rule}
          </div>
        </div>

        <SignalBlock kind="hard" items={layer.hard} />
        <SignalBlock kind="soft" items={layer.soft} />
        <SignalBlock kind="reconsider" items={layer.reconsider} />
      </div>
    </article>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function ReglerPage() {
  const mono = 'var(--font-dm-mono)'
  const corm = 'var(--font-cormorant)'

  return (
    <div style={{ minHeight: '100vh', background: '#e9e5da' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ─── Page Header ─── */}
        <header style={{ marginBottom: 36 }}>
          <div style={{
            fontFamily: mono,
            fontSize: 10,
            color: '#111111',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}>
            ◈ REGLER
          </div>
          <h1 style={{
            fontFamily: corm,
            fontSize: 44,
            fontWeight: 600,
            color: '#111111',
            margin: 0,
            lineHeight: 1.05,
          }}>
            Salgs<em style={{ fontStyle: 'italic', fontWeight: 500 }}>regler</em>
          </h1>
          <p style={{
            fontFamily: mono,
            fontSize: 11,
            color: '#666666',
            marginTop: 8,
            marginBottom: 0,
            letterSpacing: '0.02em',
            maxWidth: 720,
            lineHeight: 1.55,
          }}>
            Framework for hvornår en position sælges — differentieret efter lag.
          </p>
        </header>

        {/* ─── Legend (visual key for signal kinds) ─── */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 28,
        }}>
          {([
            { emoji: '🔴', label: 'Hård regel', sub: 'salg' },
            { emoji: '🟠', label: 'Blød signal', sub: 'tæller' },
            { emoji: '🟡', label: 'Genovervej', sub: 'opfølgning' },
          ] as const).map((l) => (
            <span key={l.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: mono, fontSize: 10,
              padding: '5px 10px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 999,
              color: '#444444',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              <span aria-hidden style={{ fontSize: 9 }}>{l.emoji}</span>
              <span style={{ fontWeight: 500 }}>{l.label}</span>
              <span style={{ color: '#aaaaaa' }}>· {l.sub}</span>
            </span>
          ))}
        </div>

        {/* ─── Lag-kort ─── */}
        {LAYERS.map((layer) => (
          <LayerCard key={layer.id} layer={layer} />
        ))}

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
