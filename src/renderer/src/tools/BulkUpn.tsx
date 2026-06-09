import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

type BucUser = {
  id: string
  displayName: string
  userPrincipalName: string
  department: string
  officeLocation: string
}
type Row = { id: string; name: string; oldUpn: string; newUpn: string; status: 'Pending' | 'Done' | 'Error' }

function counts(users: BucUser[], field: 'department' | 'officeLocation'): [string, number][] {
  const m = new Map<string, number>()
  for (const u of users) {
    const v = u[field]
    if (v) m.set(v, (m.get(v) ?? 0) + 1)
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function BulkUpn(): JSX.Element {
  const { tenantId, connected, dry, setStatus } = useApp()
  const [users, setUsers] = useState<BucUser[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [domain, setDomain] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [dept, setDept] = useState('')
  const [office, setOffice] = useState('')
  const [rowSel, setRowSel] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      setDomains([])
      setRows([])
      return
    }
    api
      .invoke<{ users: BucUser[]; domains: string[] }>('buc:load', { tenantId })
      .then(({ users, domains }) => {
        setUsers(users)
        setDomains(domains)
        setDomain(domains[0] ?? '')
        setStatus({
          text: `Loaded ${users.length} cloud-only user(s) and ${domains.length} verified domain(s).`,
          tone: 'ok'
        })
      })
      .catch((e) => setStatus({ text: `Load error: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  const depts = useMemo(() => counts(users, 'department'), [users])
  const offices = useMemo(() => counts(users, 'officeLocation'), [users])

  useEffect(() => {
    if (depts.length && !dept) setDept(depts[0][0])
  }, [depts, dept])
  useEffect(() => {
    if (offices.length && !office) setOffice(offices[0][0])
  }, [offices, office])

  const addedIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows])

  const local = (upn: string): string => upn.split('@')[0]
  const makeRow = (u: BucUser): Row => ({
    id: u.id,
    name: u.displayName,
    oldUpn: u.userPrincipalName,
    newUpn: domain ? `${local(u.userPrincipalName)}@${domain}` : '',
    status: 'Pending'
  })

  function addByField(field: 'department' | 'officeLocation', value: string): void {
    const toAdd = users.filter((u) => u[field] === value && !addedIds.has(u.id))
    if (toAdd.length === 0) {
      setStatus({ text: `No new users to add for ${value} (all already in list).`, tone: 'dim' })
      return
    }
    setRows((prev) => [...prev, ...toAdd.map(makeRow)])
    setStatus({ text: `Added ${toAdd.length} user(s) from: ${value}`, tone: 'ok' })
  }

  function addSelected(): void {
    const toAdd = users.filter((u) => picked.has(u.id) && !addedIds.has(u.id))
    setRows((prev) => [...prev, ...toAdd.map(makeRow)])
    setPicked(new Set())
  }

  // Recompute pending New UPNs when the target domain changes.
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'Pending'
          ? { ...r, newUpn: domain ? `${local(r.oldUpn)}@${domain}` : '' }
          : r
      )
    )
  }, [domain])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        !addedIds.has(u.id) &&
        (!q ||
          u.displayName.toLowerCase().includes(q) ||
          u.userPrincipalName.toLowerCase().includes(q))
    )
  }, [users, search, addedIds])

  const pending = rows.filter((r) => r.status === 'Pending')
  const canApply = !!domain && pending.length > 0 && pending.every((r) => r.newUpn) && !running

  async function apply(): Promise<void> {
    if (pending.length === 0) return
    const ok = window.confirm(
      `WARNING — this can break things!\n\n` +
        `You are about to change the UPN domain for ${pending.length} user(s) to @${domain}.\n\n` +
        `• All active sessions and refresh tokens are immediately invalidated\n` +
        `• The sign-in name changes right now — users may be unable to sign in\n` +
        `• Apps or integrations that hard-code UPNs will break\n` +
        `• If Azure AD Connect is running it may revert these changes\n\n` +
        `Are you absolutely sure you want to continue?`
    )
    if (!ok) return

    setRunning(true)
    let done = 0
    let failed = 0
    for (const r of pending) {
      const res = await api.invoke<{ ok: boolean; err?: string }>('buc:applyOne', {
        tenantId,
        id: r.id,
        oldUpn: r.oldUpn,
        newUpn: r.newUpn
      })
      if (res.ok) done++
      else failed++
      setRows((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: res.ok ? 'Done' : 'Error' } : x))
      )
    }
    setRunning(false)
    setStatus({
      text: `Done — changed: ${done}  failed: ${failed}`,
      tone: failed > 0 ? 'warn' : 'ok'
    })
  }

  function togglePick(id: string): void {
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function toggleRow(id: string): void {
    setRowSel((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="tool" style={{ gridTemplateColumns: '300px 1fr' }}>
      <div className="tool-side">
        <div style={{ padding: 12, overflowY: 'auto' }}>
          <div className="label">BY DEPARTMENT</div>
          <select value={dept} disabled={!depts.length} onChange={(e) => setDept(e.target.value)}>
            {depts.map(([d, c]) => (
              <option key={d} value={d}>{d}  ({c})</option>
            ))}
          </select>
          <button
            className="btn-indigo"
            style={{ width: '100%', marginTop: 6 }}
            disabled={!depts.length}
            onClick={() => addByField('department', dept)}
          >
            Add All →
          </button>

          <div className="label" style={{ marginTop: 14 }}>BY OFFICE LOCATION</div>
          <select value={office} disabled={!offices.length} onChange={(e) => setOffice(e.target.value)}>
            {offices.map(([o, c]) => (
              <option key={o} value={o}>{o}  ({c})</option>
            ))}
          </select>
          <button
            className="btn-indigo"
            style={{ width: '100%', marginTop: 6 }}
            disabled={!offices.length}
            onClick={() => addByField('officeLocation', office)}
          >
            Add All →
          </button>

          <div className="label" style={{ marginTop: 14 }}>INDIVIDUAL SEARCH</div>
          <input
            type="text"
            placeholder="Filter by name or UPN"
            value={search}
            disabled={!connected}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="tool-list">
          {shown.map((u) => (
            <div
              key={u.id}
              className={`row${picked.has(u.id) ? ' sel' : ''}`}
              onClick={() => togglePick(u.id)}
            >
              <div>{u.displayName}</div>
              <div className="upn">{u.userPrincipalName}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
          <button
            className="btn-indigo"
            style={{ width: '100%' }}
            disabled={picked.size === 0}
            onClick={addSelected}
          >
            Add Selected → ({picked.size})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="tenantbar" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="lbl">Target domain:</span>
          <select
            style={{ width: 220 }}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button
            className="btn-grey"
            style={{ marginLeft: 'auto' }}
            disabled={rowSel.size === 0}
            onClick={() => {
              setRows((prev) => prev.filter((r) => !rowSel.has(r.id)))
              setRowSel(new Set())
            }}
          >
            Remove
          </button>
          <button
            className="btn-grey"
            disabled={rows.length === 0}
            onClick={() => {
              setRows([])
              setRowSel(new Set())
            }}
          >
            Clear All
          </button>
          <button className="btn-danger" disabled={!canApply} onClick={apply}>
            {dry ? 'Apply Changes (Dry Run)' : 'Apply Changes'}
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table className="grid">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Current UPN</th>
                <th>New UPN</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`clickable${rowSel.has(r.id) ? ' sel' : ''}`}
                  onClick={() => toggleRow(r.id)}
                >
                  <td>{r.name}</td>
                  <td>{r.oldUpn}</td>
                  <td className="mono">{r.newUpn}</td>
                  <td>
                    <span className={r.status === 'Done' ? 'ok' : r.status === 'Error' ? 'bad' : 'muted'}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="muted" style={{ padding: '28px 32px' }}>
              Add users from the left to build a change list.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
