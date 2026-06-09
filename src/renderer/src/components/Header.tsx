import { useApp } from '../store'

// Vite resolves this relative URL at build time and bundles the image correctly
// for both dev and production (including packaged Electron).
const iconUrl = new URL('../../../../assets/icon.png', import.meta.url).href

export default function Header(): JSX.Element {
  const { connected, tenantName, account, dry } = useApp()
  return (
    <header className={`header${dry ? ' dry' : ''}`}>
      <img src={iconUrl} alt="" className="logo" style={{ background: 'transparent', objectFit: 'contain' }} />
      <div>
        <div className="title">Art's Entra Toolbox</div>
        <div className="subtitle">Tenant management toolkit</div>
      </div>
      {connected && (
        <div className="badge">
          <span className="dot" />
          {tenantName || account}
        </div>
      )}
    </header>
  )
}
