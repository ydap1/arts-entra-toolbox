import { useEffect, useMemo, useState } from 'react'
import UserPicker from '../components/UserPicker'
import { api } from '../api'
import { useApp } from '../store'
import type { GraphUser } from '../types'

type Sku = {
  skuId: string
  skuPartNumber: string
  friendlyName: string
  consumedUnits: number
  prepaidUnits: { enabled: number }
}

type AssignedLicense = {
  skuId: string
  skuPartNumber: string
  friendlyName: string
}

type Tab = 'assigned' | 'available'

export default function Licenses(): JSX.Element {
  const { tenantId, connected, dry, setStatus } = useApp()
  const [user, setUser] = useState<GraphUser | null>(null)
  const [tenantSkus, setTenantSkus] = useState<Sku[]>([])
  const [userLicenses, setUserLicenses] = useState<AssignedLicense[] | null>(null)
  const [tab, setTab] = useState<Tab>('assigned')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) { setTenantSkus([]); return }
    api
      .invoke<Sku[]>('lic:skus', { tenantId })
      .then(setTenantSkus)
      .catch((e) => setStatus({ text: `Failed to load SKUs: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  useEffect(() => {
    if (!user || !tenantId) { setUserLicenses(null); return }
    setUserLicenses(null)
    api
      .invoke<AssignedLicense[]>('lic:userLicenses', { tenantId, userId: user.id })
      .then(setUserLicenses)
      .catch((e) => setStatus({ text: `Failed to load licenses: ${String(e)}`, tone: 'bad' }))
  }, [user?.id, tenantId])

  const assignedIds = useMemo(() => new Set((userLicenses ?? []).map((l) => l.skuId)), [userLicenses])

  const available = useMemo(
    () => tenantSkus.filter((s) => !assignedIds.has(s.skuId)),
    [tenantSkus, assignedIds]
  )

  async function remove(skuId: string, name: string): Promise<void> {
    if (!user || !tenantId) return
    setBusy(true)
    setStatus({ text: `Removing ${name} from ${user.displayName}…`, tone: 'dim' })
    try {
      await api.invoke('lic:assign', { tenantId, userId: user.id, addSkuIds: [], removeSkuIds: [skuId] })
      setStatus({
        text: dry ? `[DRY] Would remove ${name} from ${user.displayName}.` : `Removed ${name} from ${user.displayName}.`,
        tone: dry ? 'warn' : 'ok'
      })
      if (!dry) setUserLicenses((prev) => prev?.filter((l) => l.skuId !== skuId) ?? null)
    } catch (err) {
      setStatus({ text: `Remove failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setBusy(false)
    }
  }

  async function assign(sku: Sku): Promise<void> {
    if (!user || !tenantId) return
    const remaining = (sku.prepaidUnits?.enabled ?? 0) - (sku.consumedUnits ?? 0)
    if (remaining <= 0 && !dry) {
      setStatus({ text: `No available seats for ${sku.friendlyName}.`, tone: 'warn' })
      return
    }
    setBusy(true)
    setStatus({ text: `Assigning ${sku.friendlyName} to ${user.displayName}…`, tone: 'dim' })
    try {
      await api.invoke('lic:assign', { tenantId, userId: user.id, addSkuIds: [sku.skuId], removeSkuIds: [] })
      setStatus({
        text: dry ? `[DRY] Would assign ${sku.friendlyName} to ${user.displayName}.` : `Assigned ${sku.friendlyName} to ${user.displayName}.`,
        tone: dry ? 'warn' : 'ok'
      })
      if (!dry) {
        setUserLicenses((prev) =>
          prev
            ? [...prev, { skuId: sku.skuId, skuPartNumber: sku.skuPartNumber, friendlyName: sku.friendlyName }]
            : null
        )
      }
    } catch (err) {
      setStatus({ text: `Assign failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setBusy(false)
    }
  }

  function selectUser(u: GraphUser): void {
    setUser(u)
    setUserLicenses(null)
    setTab('assigned')
  }

  return (
    <div className="tool">
      <UserPicker selectedId={user?.id ?? null} onSelect={selectUser} />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="upr-tabs">
          <button className={tab === 'assigned' ? 'tab sel' : 'tab'} onClick={() => setTab('assigned')}>
            Assigned
          </button>
          <button className={tab === 'available' ? 'tab sel' : 'tab'} onClick={() => setTab('available')}>
            Available ({available.length})
          </button>
        </div>

        {!user && (
          <p className="muted" style={{ padding: '28px 32px' }}>
            Select a user on the left to manage their licences.
          </p>
        )}

        {user && tab === 'assigned' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {userLicenses === null && (
              <p className="muted" style={{ padding: '28px 32px' }}>Loading…</p>
            )}
            {userLicenses !== null && userLicenses.length === 0 && (
              <p className="muted" style={{ padding: '28px 32px' }}>No licences assigned.</p>
            )}
            {userLicenses !== null && userLicenses.length > 0 && (
              <table className="grid">
                <thead>
                  <tr>
                    <th>Licence</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {userLicenses.map((l) => (
                    <tr key={l.skuId}>
                      <td>{l.friendlyName}</td>
                      <td>
                        <button
                          className="btn-danger btn-sm"
                          disabled={busy || !connected}
                          onClick={() => remove(l.skuId, l.friendlyName)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {user && tab === 'available' && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {tenantSkus.length === 0 && (
              <p className="muted" style={{ padding: '28px 32px' }}>Loading SKUs…</p>
            )}
            {tenantSkus.length > 0 && available.length === 0 && (
              <p className="muted" style={{ padding: '28px 32px' }}>
                All tenant licences are already assigned to this user.
              </p>
            )}
            {available.length > 0 && (
              <table className="grid">
                <thead>
                  <tr>
                    <th>Licence</th>
                    <th>Available seats</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {available.map((s) => {
                    const seats = (s.prepaidUnits?.enabled ?? 0) - (s.consumedUnits ?? 0)
                    return (
                      <tr key={s.skuId}>
                        <td>{s.friendlyName}</td>
                        <td className={seats <= 0 ? 'bad' : 'muted'}>{seats <= 0 ? 'None' : seats}</td>
                        <td>
                          <button
                            className="btn-accent btn-sm"
                            disabled={busy || !connected || seats <= 0}
                            onClick={() => assign(s)}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
