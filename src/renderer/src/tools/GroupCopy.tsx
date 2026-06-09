import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import type { GraphUser } from '../types'

type GcGroup = { id: string; displayName: string }
type GroupStatus = 'Pending' | 'Added' | 'Skipped' | 'Failed'
type GroupRow = GcGroup & { status: GroupStatus }

function MiniPicker({
  heading,
  users,
  selectedId,
  onSelect,
  disabled
}: {
  heading: string
  users: GraphUser[]
  selectedId: string | null
  onSelect: (u: GraphUser) => void
  disabled: boolean
}): JSX.Element {
  const [filter, setFilter] = useState('')
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return users
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(f) || u.userPrincipalName.toLowerCase().includes(f)
    )
  }, [users, filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="tool-side-head">
        <div className="label">{heading}</div>
        <input
          type="text"
          placeholder="Search users…"
          value={filter}
          disabled={disabled}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="tool-list">
        {shown.map((u) => (
          <div
            key={u.id}
            className={`row${selectedId === u.id ? ' sel' : ''}`}
            onClick={() => onSelect(u)}
          >
            <div>{u.displayName}</div>
            <div className="upn">{u.userPrincipalName}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GroupCopy(): JSX.Element {
  const { tenantId, connected, dry, setStatus } = useApp()
  const [users, setUsers] = useState<GraphUser[]>([])
  const [source, setSource] = useState<GraphUser | null>(null)
  const [target, setTarget] = useState<GraphUser | null>(null)
  const [rows, setRows] = useState<GroupRow[]>([])
  const [groupNote, setGroupNote] = useState('Select a source user to view their groups.')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      setSource(null)
      setTarget(null)
      setRows([])
      return
    }
    api
      .listUsers(tenantId)
      .then((list) => setUsers([...list].sort((a, b) => a.displayName.localeCompare(b.displayName))))
      .catch((e) => setStatus({ text: `Load error: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  function selectSource(u: GraphUser): void {
    setSource(u)
    setRows([])
    setGroupNote('Loading source user groups…')
    api
      .invoke<GcGroup[]>('gc:groups', { tenantId, userId: u.id })
      .then((groups) => {
        setRows(groups.map((g) => ({ ...g, status: 'Pending' })))
        if (groups.length === 0) setGroupNote('Source user has no group memberships.')
      })
      .catch((e) => setGroupNote(`Error: ${String(e)}`))
  }

  const canCopy =
    !!source && !!target && source.id !== target.id && rows.length > 0 && !running

  async function copy(): Promise<void> {
    if (!source || !target || rows.length === 0) return
    setRunning(true)
    setRows((prev) => prev.map((r) => ({ ...r, status: 'Pending' })))

    const existing = new Set(
      dry ? [] : await api.invoke<string[]>('gc:memberIds', { tenantId, userId: target.id })
    )

    let added = 0
    let skipped = 0
    let failed = 0
    for (const g of rows) {
      if (existing.has(g.id)) {
        skipped++
        setRows((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: 'Skipped' } : x)))
        continue
      }
      const res = await api.invoke<{ ok: boolean; err?: string }>('gc:addOne', {
        tenantId,
        groupId: g.id,
        targetId: target.id,
        name: g.displayName
      })
      if (res.ok) added++
      else failed++
      setRows((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, status: res.ok ? 'Added' : 'Failed' } : x))
      )
    }
    setRunning(false)
    setStatus({
      text: `Done — added: ${added}  skipped: ${skipped}  failed: ${failed}`,
      tone: failed > 0 ? 'warn' : 'ok'
    })
  }

  const groupHeader = source
    ? rows.length
      ? `${rows.length} group${rows.length === 1 ? '' : 's'} on source user`
      : 'Source user has no group memberships'
    : 'Select a source user to view their groups'

  return (
    <div className="tool">
      <div className="tool-side" style={{ display: 'flex', flexDirection: 'column' }}>
        <MiniPicker
          heading="SOURCE — COPY FROM"
          users={users}
          selectedId={source?.id ?? null}
          onSelect={selectSource}
          disabled={!connected}
        />
        <div style={{ height: 1, background: 'var(--border)' }} />
        <MiniPicker
          heading="TARGET — COPY TO"
          users={users}
          selectedId={target?.id ?? null}
          onSelect={setTarget}
          disabled={!connected}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          className="tenantbar"
          style={{ borderBottom: '1px solid var(--border)', height: 'auto', padding: '12px 16px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="dim">{groupHeader}</span>
            {source && <span className="accent" style={{ fontSize: 11 }}>Source: {source.displayName}</span>}
            {target && <span className="muted" style={{ fontSize: 11 }}>Target: {target.displayName}</span>}
          </div>
          <button className="btn-indigo" style={{ marginLeft: 'auto' }} disabled={!canCopy} onClick={copy}>
            {dry ? 'Copy Groups (Dry Run)' : 'Copy Groups'}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {rows.length === 0 ? (
            <p className="muted" style={{ padding: '28px 32px' }}>
              {groupNote}
            </p>
          ) : (
            <table className="grid">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.displayName}</td>
                    <td>
                      <span className={groupStatusClass(r.status)}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function groupStatusClass(s: GroupStatus): string {
  if (s === 'Added') return 'ok'
  if (s === 'Failed') return 'bad'
  if (s === 'Skipped') return 'dim'
  return 'muted'
}
