import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

type IidUser = {
  id: string
  displayName: string
  userPrincipalName: string
  onPremisesImmutableId: string | null
}
type Status = 'Pending' | 'Ready' | 'Assigned' | 'Error' | 'Removed'
type Row = {
  id: string
  name: string
  upn: string
  currentId: string
  hasExisting: boolean
  newId: string
  status: Status
  selected: boolean
}

// Base64 of 16 random bytes — same shape as a Base64-encoded GUID.
function newImmutableId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}

export default function ImmutableId(): JSX.Element {
  const { tenantId, connected, dry, demo, setStatus } = useApp()
  const [loaded, setLoaded] = useState<IidUser[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [emptyOnly, setEmptyOnly] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) {
      setLoaded([])
      setRows([])
      return
    }
    api
      .invoke<IidUser[]>('iid:load', { tenantId })
      .then((users) => {
        setLoaded(users)
        setStatus({ text: `Loaded ${users.length} cloud-only user(s).`, tone: 'ok' })
      })
      .catch((e) => setStatus({ text: `Load error: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  // Rebuild rows from the raw load, preserving selections + generated IDs.
  useEffect(() => {
    setRows((prev) => {
      const prevById = new Map(prev.map((r) => [r.id, r]))
      const next: Row[] = []
      for (const u of loaded) {
        const cid = u.onPremisesImmutableId ?? ''
        if (emptyOnly && cid) continue
        const old = prevById.get(u.id)
        next.push({
          id: u.id,
          name: u.displayName,
          upn: u.userPrincipalName,
          currentId: cid || '—',
          hasExisting: !!cid,
          newId: old?.newId ?? '',
          status: old?.status ?? 'Pending',
          selected: old ? old.selected : !cid
        })
      }
      return next
    })
  }, [loaded, emptyOnly])

  const counts = useMemo(() => {
    const total = rows.length
    const selected = rows.filter((r) => r.selected).length
    const ready = rows.filter((r) => r.selected && r.newId).length
    const removable = rows.filter((r) => r.selected && r.hasExisting).length
    const anyPending = rows.some((r) => r.selected && !r.newId)
    return { total, selected, ready, removable, anyPending }
  }, [rows])

  function toggle(id: string): void {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)))
  }
  function setAll(value: boolean): void {
    setRows((prev) => prev.map((r) => ({ ...r, selected: value })))
  }

  function generate(): void {
    let n = 0
    setRows((prev) =>
      prev.map((r) => {
        if (r.selected && !r.newId) {
          n++
          return { ...r, newId: newImmutableId(), status: 'Ready' }
        }
        return r
      })
    )
    setStatus({ text: `Generated ImmutableId for ${n} selected user(s).`, tone: 'ok' })
  }

  async function assign(): Promise<void> {
    const toAssign = rows.filter((r) => r.selected && r.newId)
    if (toAssign.length === 0) {
      setStatus({ text: 'No selected rows have a generated ID. Generate IDs first.', tone: 'dim' })
      return
    }
    const haveExisting = toAssign.filter((r) => r.hasExisting)
    if (haveExisting.length > 0 && !overwrite) {
      setStatus({
        text: `${haveExisting.length} selected user(s) already have an ImmutableId. Enable overwriting or deselect them.`,
        tone: 'warn'
      })
      return
    }
    if (!dry && !demo) {
      const ok = window.confirm(
        `You are about to permanently assign an ImmutableId to ${toAssign.length} user account(s).\n\n` +
          `WARNING — this action:\n` +
          `• Cannot be undone without Microsoft Support assistance\n` +
          `• Binds each account to a specific AD Connect sync anchor\n` +
          `• May prevent the account being imported from on-premises AD later\n\n` +
          `Continue?`
      )
      if (!ok) return
    }

    setRunning(true)
    let ok = 0
    let failed = 0
    for (const r of toAssign) {
      const res = await api.invoke<{ ok: boolean; err?: string }>('iid:assignOne', {
        tenantId,
        id: r.id,
        name: r.name,
        newId: r.newId
      })
      if (res.ok) ok++
      else failed++
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? res.ok
              ? { ...x, status: 'Assigned', currentId: x.newId, newId: '', hasExisting: true }
              : { ...x, status: 'Error' }
            : x
        )
      )
    }
    setRunning(false)
    setStatus({ text: `Done — ${ok} assigned, ${failed} error(s).`, tone: failed > 0 ? 'warn' : 'ok' })
  }

  async function remove(): Promise<void> {
    const toRemove = rows.filter((r) => r.selected && r.hasExisting)
    if (toRemove.length === 0) {
      setStatus({ text: 'No selected rows have an existing ImmutableId to remove.', tone: 'dim' })
      return
    }
    if (!dry && !demo) {
      const ok = window.confirm(
        `You are about to remove the ImmutableId from ${toRemove.length} user account(s).\n\n` +
          `WARNING — removing the ImmutableId:\n` +
          `• Breaks any existing AD Connect soft-match or sync anchor\n` +
          `• Cannot be undone without reassigning a new ID\n\n` +
          `Continue?`
      )
      if (!ok) return
    }

    setRunning(true)
    let ok = 0
    let failed = 0
    for (const r of toRemove) {
      const res = await api.invoke<{ ok: boolean; err?: string }>('iid:removeOne', {
        tenantId,
        id: r.id,
        name: r.name
      })
      if (res.ok) ok++
      else failed++
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? res.ok
              ? { ...x, status: 'Removed', currentId: '—', newId: '', hasExisting: false }
              : { ...x, status: 'Error' }
            : x
        )
      )
    }
    setRunning(false)
    setStatus({ text: `Done — ${ok} removed, ${failed} error(s).`, tone: failed > 0 ? 'warn' : 'ok' })
  }

  const busy = running || !connected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <h2 className="tool-h">Immutable ID Assignment</h2>
        <p className="tool-sub" style={{ margin: '4px 0 0' }}>
          Assign or remove the onPremisesImmutableId on cloud-only users. Select accounts, generate
          and assign IDs — or remove an existing ID from selected users.
        </p>
      </div>

      <div
        className="row-inline"
        style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', gap: 24 }}
      >
        <label className="check">
          <input
            type="checkbox"
            checked={emptyOnly}
            onChange={(e) => setEmptyOnly(e.target.checked)}
          />
          Show only users without an existing ImmutableId
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          <span className="warn">Allow overwriting existing ImmutableIds ⚠ permanent</span>
        </label>
      </div>

      <div className="tenantbar" style={{ borderBottom: '1px solid var(--border)' }}>
        <button className="btn-grey btn-sm" disabled={busy || !rows.length} onClick={() => setAll(true)}>
          Select All
        </button>
        <button className="btn-grey btn-sm" disabled={busy || !rows.length} onClick={() => setAll(false)}>
          Deselect All
        </button>
        <span className="muted" style={{ marginLeft: 8 }}>
          {counts.total} shown · {counts.selected} selected · {counts.ready} ready to assign
        </span>
        <button
          className="btn-indigo"
          style={{ marginLeft: 'auto' }}
          disabled={busy || !counts.anyPending}
          onClick={generate}
        >
          Generate IDs
        </button>
        <button className="btn-on" disabled={busy || counts.ready === 0} onClick={assign}>
          {dry ? 'Assign (Dry Run)' : 'Assign'}
        </button>
        <button className="btn-danger" disabled={busy || counts.removable === 0} onClick={remove}>
          {dry ? 'Remove (Dry Run)' : 'Remove'}
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 34 }}></th>
              <th>Display Name</th>
              <th>User Principal Name</th>
              <th>Current ImmutableId</th>
              <th>New ImmutableId</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => toggle(r.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={r.selected} onChange={() => toggle(r.id)} />
                </td>
                <td>{r.name}</td>
                <td>{r.upn}</td>
                <td className="mono muted">{r.currentId}</td>
                <td className="mono">{r.newId}</td>
                <td>
                  <span className={statusClass(r.status)}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="muted" style={{ padding: '28px 32px' }}>
            {connected ? 'No cloud-only users to show.' : 'Connect to a tenant to load users.'}
          </p>
        )}
      </div>
    </div>
  )
}

function statusClass(s: Status): string {
  if (s === 'Ready') return 'accent'
  if (s === 'Assigned') return 'ok'
  if (s === 'Error') return 'bad'
  if (s === 'Removed') return 'dim'
  return 'muted'
}
