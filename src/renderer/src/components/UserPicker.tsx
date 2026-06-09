import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import type { GraphUser } from '../types'

type Props = {
  selectedId: string | null
  onSelect: (user: GraphUser) => void
  heading?: string
}

// Left sidebar user search + list — shared by the user-centric tools
// (User Password Reset, Immutable ID, Group Copy).
export default function UserPicker({ selectedId, onSelect, heading = 'USERS' }: Props): JSX.Element {
  const { tenantId, connected } = useApp()
  const [users, setUsers] = useState<GraphUser[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .listUsers(tenantId)
      .then((list) => {
        if (cancelled) return
        setUsers([...list].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      })
      .catch(() => !cancelled && setUsers([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [tenantId, connected])

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return users
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(f) ||
        u.userPrincipalName.toLowerCase().includes(f)
    )
  }, [users, filter])

  return (
    <div className="tool-side">
      <div className="tool-side-head">
        <div className="label">{heading}</div>
        <input
          type="text"
          placeholder="Search users…"
          value={filter}
          disabled={!connected || loading}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="tool-list">
        {loading && <div className="row muted">Loading users…</div>}
        {!loading && connected && shown.length === 0 && (
          <div className="row muted">No users.</div>
        )}
        {!loading && !connected && <div className="row muted">Connect a tenant.</div>}
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
