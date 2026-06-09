import { useState } from 'react'
import { useApp } from '../store'
import AddTenantDialog from './AddTenantDialog'

export default function TenantBar(): JSX.Element {
  const {
    tenants,
    tenantId,
    connected,
    demo,
    dry,
    busy,
    logOpen,
    selectTenant,
    removeTenant,
    disconnect,
    startDemo,
    toggleDry,
    toggleLog
  } = useApp()
  const [showAdd, setShowAdd] = useState(false)

  const selectedReal = tenantId && tenantId !== 'DEMO' ? tenantId : ''

  async function onRemove(): Promise<void> {
    if (!selectedReal) return
    const t = tenants.find((x) => x.tenantId === selectedReal)
    if (confirm(`Remove tenant '${t?.displayName || selectedReal}'?`)) {
      await removeTenant(selectedReal)
    }
  }

  return (
    <div className="tenantbar">
      <span className="lbl">Tenant:</span>
      <select
        value={selectedReal}
        disabled={busy || tenants.length === 0}
        onChange={(e) => e.target.value && selectTenant(e.target.value)}
      >
        {tenants.length === 0 && <option value="">No tenants</option>}
        {tenants.map((t) => (
          <option key={t.tenantId} value={t.tenantId}>
            {t.displayName || t.tenantId}
          </option>
        ))}
      </select>

      <button
        className="btn-indigo btn-icon"
        title="Add a new tenant"
        disabled={busy}
        onClick={() => setShowAdd(true)}
      >
        +
      </button>
      <button
        className="btn-grey btn-icon"
        title="Remove selected tenant"
        disabled={busy || !selectedReal}
        onClick={onRemove}
      >
        –
      </button>
      <button
        className="btn-danger btn-sm"
        title="Sign out and clear saved credentials"
        disabled={!connected || demo}
        onClick={disconnect}
      >
        Disconnect
      </button>
      <button
        className={dry ? 'btn-on btn-sm' : 'btn-grey btn-sm'}
        title="Toggle dry mode — actions are logged but not executed"
        onClick={toggleDry}
      >
        {dry ? 'Dry Run ON' : 'Dry Run'}
      </button>
      <button
        className={logOpen ? 'btn-accent btn-sm' : 'btn-grey btn-sm'}
        title="Show/hide activity log"
        onClick={toggleLog}
      >
        Log
      </button>
      <button
        className="btn-grey btn-sm"
        title="Run in demo mode with fake Contoso Academy data"
        onClick={startDemo}
      >
        Demo
      </button>

      {showAdd && <AddTenantDialog onClose={() => setShowAdd(false)} />}
    </div>
  )
}
