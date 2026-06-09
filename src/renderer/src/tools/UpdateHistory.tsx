import { CHANGELOG } from '../changelog'

export default function UpdateHistory(): JSX.Element {
  return (
    <div className="pane">
      <h2 className="tool-h">Update History</h2>
      <p className="tool-sub">Art’s Entra Toolbox — version changelog</p>
      {CHANGELOG.map((r) => (
        <div className="card" key={r.version}>
          <div className="row-inline" style={{ justifyContent: 'space-between' }}>
            <span className="ver-badge">v{r.version}</span>
            <span className="muted">{r.date}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
          {r.changes.map((c, i) => (
            <div key={i} style={{ fontSize: 12, margin: '4px 0' }}>
              • {c}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
