import { useState } from 'react'
import { useApp } from '../store'

export default function AddTenantDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const { addTenant } = useApp()
  const [tid, setTid] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function connect(): Promise<void> {
    const id = tid.trim()
    if (!id) {
      setErr('Tenant ID is required.')
      return
    }
    setBusy(true)
    setErr('')
    const res = await addTenant(id, name.trim())
    setBusy(false)
    if (res.ok) onClose()
    else setErr(res.error ?? 'Authentication failed.')
  }

  return (
    <div className="dlg-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg">
        <h3>Add Tenant</h3>
        <div className="field">
          <label>Tenant ID or domain</label>
          <input
            type="text"
            autoFocus
            placeholder="contoso.onmicrosoft.com"
            value={tid}
            disabled={busy}
            onChange={(e) => setTid(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
          />
        </div>
        <div className="field">
          <label>Display name (optional)</label>
          <input
            type="text"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
          />
        </div>
        {err && <div className="bad" style={{ fontSize: 11 }}>{err}</div>}
        <div className="dlg-actions">
          <button className="btn-grey btn-sm" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="btn-indigo btn-sm" disabled={busy} onClick={connect}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
