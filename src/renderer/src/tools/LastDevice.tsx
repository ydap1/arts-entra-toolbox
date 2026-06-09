import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import { VirtualList } from '../components/VirtualList'

type LdUser = { id: string; displayName: string; userPrincipalName: string }
type LdLogon = { userId: string; lastLogOnDateTime: string | null }
type LdDevice = {
  id: string
  deviceName: string
  lastSyncDateTime: string | null
  usersLoggedOn: LdLogon[]
}
type Tab = 'user' | 'device' | 'stale'

// Row height for the virtual list: padding (8+8=16px) + two text lines (~34px) = ~50px.
const ROW_H = 52

const STALE_DAYS = [7, 30, 60, 90]

function ts(s: string | null): number {
  if (!s) return 0
  const t = Date.parse(s)
  return isNaN(t) ? 0 : t
}
function fmt(s: string | null): string {
  const t = ts(s)
  return t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : 'Never'
}

export default function LastDevice(): JSX.Element {
  const { tenantId, connected, setStatus } = useApp()
  const [users, setUsers] = useState<LdUser[]>([])
  const [devices, setDevices] = useState<LdDevice[]>([])
  const userCountRef = useRef(0) // read inside the devices callback without a stale closure
  const [tab, setTab] = useState<Tab>('user')

  // By User
  const [userSearch, setUserSearch] = useState('')
  const [pickedUser, setPickedUser] = useState<string | null>(null)
  // By Device
  const [devSearch, setDevSearch] = useState('')
  const [pickedDev, setPickedDev] = useState<string | null>(null)
  // Stale
  const [staleDays, setStaleDays] = useState(30)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      setDevices([])
      userCountRef.current = 0
      setPickedUser(null)
      setPickedDev(null)
      return
    }

    setStatus({ text: 'Loading users and devices…', tone: 'dim' })

    // Load independently so each list appears as soon as its data arrives
    // instead of waiting for the slower of the two.
    api
      .invoke<LdUser[]>('ld:users', { tenantId })
      .then((us) => {
        userCountRef.current = us.length
        setUsers([...us].sort((a, b) => a.displayName.localeCompare(b.displayName)))
        setStatus({ text: `${us.length} user(s) loaded — loading devices…`, tone: 'dim' })
      })
      .catch((e) => setStatus({ text: `User load error: ${String(e)}`, tone: 'bad' }))

    api
      .invoke<LdDevice[]>('ld:devices', { tenantId })
      .then((ds) => {
        setDevices([...ds].sort((a, b) => a.deviceName.localeCompare(b.deviceName)))
        setStatus({
          text: `Loaded ${userCountRef.current || '?'} user(s) and ${ds.length} device(s).`,
          tone: 'ok'
        })
      })
      .catch((e) => setStatus({ text: `Device load error: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const shownUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) || u.userPrincipalName.toLowerCase().includes(q)
    )
  }, [users, userSearch])

  const userDevices = useMemo(() => {
    if (!pickedUser) return []
    return devices
      .filter((d) => d.usersLoggedOn.some((l) => l.userId === pickedUser))
      .map((d) => {
        const entry = d.usersLoggedOn.find((l) => l.userId === pickedUser)
        return { device: d, last: entry?.lastLogOnDateTime ?? null }
      })
      .sort((a, b) => ts(b.last) - ts(a.last))
  }, [pickedUser, devices])

  const shownDevices = useMemo(() => {
    const q = devSearch.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) => d.deviceName.toLowerCase().includes(q))
  }, [devices, devSearch])

  const deviceUsers = useMemo(() => {
    const d = devices.find((x) => x.id === pickedDev)
    if (!d) return []
    return [...d.usersLoggedOn].sort((a, b) => ts(b.lastLogOnDateTime) - ts(a.lastLogOnDateTime))
  }, [pickedDev, devices])

  const stale = useMemo(() => {
    const cutoff = Date.now() - staleDays * 86400_000
    const rows = devices
      .filter((d) => ts(d.lastSyncDateTime) <= cutoff)
      .map((d) => {
        const last = [...d.usersLoggedOn].sort(
          (a, b) => ts(b.lastLogOnDateTime) - ts(a.lastLogOnDateTime)
        )[0]
        const lastUser = last ? (userById.get(last.userId)?.displayName ?? last.userId) : '(none)'
        const sync = ts(d.lastSyncDateTime)
        const daysSince = sync ? Math.floor((Date.now() - sync) / 86400_000) : Infinity
        return {
          id: d.id,
          deviceName: d.deviceName,
          lastUser,
          lastCheckin: fmt(d.lastSyncDateTime),
          daysSince
        }
      })
      .sort((a, b) => b.daysSince - a.daysSince)
    return rows
  }, [devices, staleDays, userById])

  function copyDevice(name: string): void {
    navigator.clipboard.writeText(name).then(
      () => setStatus({ text: `Copied: ${name}`, tone: 'ok' }),
      () => setStatus({ text: 'Copy failed.', tone: 'bad' })
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="upr-tabs">
        <button className={`tab${tab === 'user' ? ' sel' : ''}`} onClick={() => setTab('user')}>
          By User
        </button>
        <button className={`tab${tab === 'device' ? ' sel' : ''}`} onClick={() => setTab('device')}>
          By Device
        </button>
        <button className={`tab${tab === 'stale' ? ' sel' : ''}`} onClick={() => setTab('stale')}>
          Stale Devices
        </button>
      </div>

      {tab === 'user' && (
        <div className="tool" style={{ gridTemplateColumns: '1fr 1fr', flex: 1 }}>
          <div className="tool-side">
            <div className="tool-side-head">
              <div className="label">USERS</div>
              <input
                type="text"
                placeholder="Search by name or UPN…"
                value={userSearch}
                disabled={!connected}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            {/* VirtualList: only renders ~15 rows at a time regardless of list size */}
            <VirtualList
              items={shownUsers}
              rowHeight={ROW_H}
              className="tool-list"
              renderItem={(u) => (
                <div
                  key={u.id}
                  className={`row${pickedUser === u.id ? ' sel' : ''}`}
                  style={{ height: ROW_H, boxSizing: 'border-box' }}
                  onClick={() => setPickedUser(u.id)}
                >
                  <div>{u.displayName}</div>
                  <div className="upn">{u.userPrincipalName}</div>
                </div>
              )}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <div className="tool-side-head">
              <div className="label">DEVICES</div>
            </div>
            {!pickedUser && (
              <p className="muted" style={{ padding: '28px 32px' }}>
                Select a user to see their devices.
              </p>
            )}
            {pickedUser && userDevices.length === 0 && (
              <p className="muted" style={{ padding: '28px 32px' }}>
                No devices found for this user.
              </p>
            )}
            {userDevices.map(({ device, last }) => (
              <div
                key={device.id}
                className="row clickable"
                style={{ padding: '8px 12px', borderBottom: '1px solid var(--gridline)' }}
                onClick={() => copyDevice(device.deviceName)}
                title="Click to copy device name"
              >
                <div>{device.deviceName}</div>
                <div className="upn">Last sign-in: {fmt(last)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'device' && (
        <div className="tool" style={{ gridTemplateColumns: '1fr 1fr', flex: 1 }}>
          <div className="tool-side">
            <div className="tool-side-head">
              <div className="label">DEVICES</div>
              <input
                type="text"
                placeholder="Search by device name…"
                value={devSearch}
                disabled={!connected}
                onChange={(e) => setDevSearch(e.target.value)}
              />
            </div>
            {/* VirtualList: only renders visible rows */}
            <VirtualList
              items={shownDevices}
              rowHeight={ROW_H}
              className="tool-list"
              renderItem={(d) => (
                <div
                  key={d.id}
                  className={`row${pickedDev === d.id ? ' sel' : ''}`}
                  style={{ height: ROW_H, boxSizing: 'border-box' }}
                  onClick={() => setPickedDev(d.id)}
                >
                  <div>{d.deviceName}</div>
                  <div className="upn">Last check-in: {fmt(d.lastSyncDateTime)}</div>
                </div>
              )}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <div className="tool-side-head">
              <div className="label">SIGNED-IN USERS</div>
            </div>
            {!pickedDev && (
              <p className="muted" style={{ padding: '28px 32px' }}>
                Select a device to see who signed into it.
              </p>
            )}
            {pickedDev && deviceUsers.length === 0 && (
              <p className="muted" style={{ padding: '28px 32px' }}>
                No sign-in records for this device.
              </p>
            )}
            {deviceUsers.map((l) => {
              const u = userById.get(l.userId)
              return (
                <div
                  key={l.userId}
                  className="row"
                  style={{ padding: '8px 12px', borderBottom: '1px solid var(--gridline)' }}
                >
                  <div>{u ? u.displayName : l.userId}</div>
                  <div className="upn">Last sign-in: {fmt(l.lastLogOnDateTime)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'stale' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="tenantbar" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="lbl">Not checked in for:</span>
            <select
              style={{ width: 130 }}
              value={staleDays}
              onChange={(e) => setStaleDays(Number(e.target.value))}
            >
              {STALE_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
            <span className="muted" style={{ marginLeft: 16 }}>
              {stale.length} device{stale.length === 1 ? '' : 's'} stale
            </span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Last User</th>
                  <th>Last Check-In</th>
                  <th>Days Since</th>
                </tr>
              </thead>
              <tbody>
                {stale.map((r) => (
                  <tr key={r.id}>
                    <td>{r.deviceName}</td>
                    <td>{r.lastUser}</td>
                    <td className="mono">{r.lastCheckin}</td>
                    <td className="mono">{r.daysSince === Infinity ? 'Never' : r.daysSince}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
