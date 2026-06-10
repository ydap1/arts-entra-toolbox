import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { NAV } from '../nav'
import { version } from '../version'

export default function NavSidebar(): JSX.Element {
  const { nav, setNav } = useApp()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV
    const out: typeof NAV = []
    let pendingCat: (typeof NAV)[0] | null = null
    for (const e of NAV) {
      if (e.type === 'cat') {
        pendingCat = e
      } else if (
        e.title.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q)
      ) {
        if (pendingCat) { out.push(pendingCat); pendingCat = null }
        out.push(e)
      }
    }
    return out
  }, [query])

  return (
    <div className="nav">
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Search tools…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', height: 30, fontSize: 12 }}
        />
      </div>
      <div className="nav-scroll">
        {filtered.map((e) =>
          e.type === 'cat' ? (
            <div className="nav-cat" key={`cat-${e.label}`}>
              {e.label}
            </div>
          ) : (
            <div
              key={e.name}
              className={`nav-item${nav === e.name ? ' sel' : ''}`}
              onClick={() => setNav(e.name)}
            >
              <div className="nav-title">{e.title}</div>
              <div className="nav-desc">{e.desc}</div>
            </div>
          )
        )}
      </div>
      <div className="nav-version">v{version}</div>
    </div>
  )
}
