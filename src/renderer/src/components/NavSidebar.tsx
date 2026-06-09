import { useApp } from '../store'
import { NAV } from '../nav'
import { version } from '../version'

export default function NavSidebar(): JSX.Element {
  const { nav, setNav } = useApp()
  return (
    <div className="nav">
      <div className="nav-scroll">
        {NAV.map((e, i) =>
          e.type === 'cat' ? (
            <div className="nav-cat" key={`cat-${i}`}>
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
