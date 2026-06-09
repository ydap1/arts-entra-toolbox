import { useEffect, useRef } from 'react'
import { useApp } from '../store'

const colorVar: Record<string, string> = {
  Text: 'var(--text)',
  TextDim: 'var(--text-dim)',
  Muted: 'var(--muted)',
  Success: 'var(--success)',
  Danger: 'var(--danger)',
  Warning: 'var(--warning)',
  Accent: 'var(--accent)'
}

export default function LogPane(): JSX.Element {
  const { logLines, clearLog } = useApp()
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logLines])

  return (
    <div className="logpane">
      <div className="logpane-head">
        <span className="label" style={{ margin: 0 }}>
          ACTIVITY LOG
        </span>
        <button className="btn-grey btn-sm" onClick={clearLog}>
          Clear
        </button>
      </div>
      <div className="logpane-body" ref={bodyRef}>
        {logLines.map((l, i) => (
          <div key={i} className="logline" style={{ color: colorVar[l.color] ?? 'var(--text-dim)' }}>
            {l.line}
          </div>
        ))}
      </div>
    </div>
  )
}
