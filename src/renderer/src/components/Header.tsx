import { useApp } from '../store'

export default function Header(): JSX.Element {
  const { connected, tenantName, account, dry } = useApp()
  return (
    <header className={`header${dry ? ' dry' : ''}`}>
      <div className="logo">E</div>
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
