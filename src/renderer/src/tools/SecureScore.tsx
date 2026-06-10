import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

type ControlScore = {
  controlName: string
  score: number
  maxScore: number
  controlCategory: string
  description: string
  implementationStatus: string
}

type ScoreData = {
  currentScore: number
  maxScore: number
  createdDateTime: string
  controlScores: ControlScore[]
}

type CategoryFilter = 'All' | 'Identity' | 'Data' | 'Device' | 'Apps' | 'Infrastructure'

function statusClass(s: string): string {
  if (s === 'full') return 'ok'
  if (s === 'partial') return 'warn'
  if (s === 'notStarted') return 'bad'
  return 'muted'
}

function statusLabel(s: string): string {
  if (s === 'full') return 'Complete'
  if (s === 'partial') return 'Partial'
  if (s === 'notStarted') return 'Not started'
  if (s === 'n/a') return 'N/A'
  return s
}

function scoreColor(pct: number): string {
  if (pct >= 70) return 'var(--success)'
  if (pct >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

export default function SecureScore(): JSX.Element {
  const { tenantId, connected, setStatus } = useApp()
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(false)
  const [catFilter, setCatFilter] = useState<CategoryFilter>('All')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  function load(): void {
    if (!tenantId || !connected) return
    setLoading(true)
    setData(null)
    api
      .invoke<ScoreData | null>('ss:data', { tenantId })
      .then((d) => {
        setData(d)
        if (!d) setStatus({ text: 'Secure Score data not available for this tenant.', tone: 'warn' })
      })
      .catch((e) => setStatus({ text: `Failed to load Secure Score: ${String(e)}`, tone: 'bad' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (connected && tenantId) load()
    else { setData(null) }
  }, [tenantId, connected])

  const CATEGORIES: CategoryFilter[] = ['All', 'Identity', 'Data', 'Device', 'Apps', 'Infrastructure']

  const controls = (data?.controlScores ?? [])
    .filter((c) => catFilter === 'All' || c.controlCategory === catFilter)
    .filter((c) => statusFilter === 'all' || c.implementationStatus === statusFilter)
    .sort((a, b) => (b.maxScore - b.score) - (a.maxScore - a.score)) // highest potential gain first

  const pct = data ? Math.round((data.currentScore / data.maxScore) * 100) : 0

  // Category breakdown for the summary row
  const categories = data
    ? CATEGORIES.filter((c) => c !== 'All').map((cat) => {
        const items = data.controlScores.filter((c2) => c2.controlCategory === cat)
        const earned = items.reduce((s, c2) => s + c2.score, 0)
        const max = items.reduce((s, c2) => s + c2.maxScore, 0)
        return { cat, earned: Math.round(earned), max: Math.round(max) }
      }).filter((x) => x.max > 0)
    : []

  return (
    <div className="pane">
      {!connected && <p className="muted">Connect a tenant to view Secure Score.</p>}

      {loading && <p className="muted">Loading Secure Score…</p>}

      {data && (
        <>
          {/* ── Score header ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center', minWidth: 110 }}>
              <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: scoreColor(pct) }}>
                {pct}%
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {Math.round(data.currentScore)} / {Math.round(data.maxScore)} pts
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: scoreColor(pct), borderRadius: 6, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {categories.map(({ cat, earned, max }) => (
                  <div
                    key={cat}
                    className="card"
                    style={{ margin: 0, padding: '6px 12px', cursor: 'pointer', minWidth: 100, background: catFilter === cat ? 'var(--selected)' : undefined }}
                    onClick={() => setCatFilter(catFilter === cat ? 'All' : cat as CategoryFilter)}
                  >
                    <div className="dim" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>{cat.toUpperCase()}</div>
                    <div style={{ fontWeight: 700 }}>{earned}<span className="muted">/{max}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn-grey btn-sm" onClick={load} disabled={loading}>↻ Refresh</button>
              <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                {data.createdDateTime ? new Date(data.createdDateTime).toLocaleDateString() : ''}
              </div>
            </div>
          </div>

          {/* ── Score context ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, fontSize: 11, flexWrap: 'wrap' }}>
            {[
              { range: '≥ 80%', label: 'Excellent', color: 'var(--success)' },
              { range: '70–79%', label: 'Good', color: 'var(--success)' },
              { range: '40–69%', label: 'Moderate risk', color: 'var(--warning)' },
              { range: '< 40%', label: 'High risk — immediate action needed', color: 'var(--danger)' },
            ].map(({ range, label, color }) => (
              <div
                key={range}
                style={{
                  border: `1px solid ${color}`,
                  borderRadius: 4,
                  padding: '3px 8px',
                  color,
                  opacity: (
                    (pct >= 80 && range === '≥ 80%') ||
                    (pct >= 70 && pct < 80 && range === '70–79%') ||
                    (pct >= 40 && pct < 70 && range === '40–69%') ||
                    (pct < 40 && range === '< 40%')
                  ) ? 1 : 0.35,
                }}
              >
                <strong>{range}</strong> — {label}
              </div>
            ))}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as CategoryFilter)} style={{ height: 30, width: 130, fontSize: 12 }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 30, width: 160, fontSize: 12 }}>
              <option value="all">All statuses</option>
              <option value="notStarted">Not started</option>
              <option value="partial">Partial</option>
              <option value="full">Complete</option>
            </select>
            <span className="muted" style={{ fontSize: 11 }}>{controls.length} control{controls.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ── Controls table ─────────────────────────────────────────────── */}
          <table className="grid">
            <thead>
              <tr>
                <th>Control</th>
                <th>Category</th>
                <th style={{ width: 90 }}>Score</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((c) => (
                <tr key={c.controlName}>
                  <td>{c.description}</td>
                  <td className="muted">{c.controlCategory}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{Math.round(c.score)}</span>
                    <span className="muted">/{Math.round(c.maxScore)}</span>
                  </td>
                  <td>
                    <span className={statusClass(c.implementationStatus)}>{statusLabel(c.implementationStatus)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
