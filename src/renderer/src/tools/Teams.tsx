import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

type TpUser = { id: string; displayName: string; userPrincipalName: string; department: string }
type Member = TpUser & { isOwner: boolean; status: 'Pending' | 'Added' | 'Failed' }
type Pop = 'year' | 'direct'
type Stats = { created: boolean; added: number; failed: number }

// "10A" → 10, "Staff" → "Staff" — the year-group anchor.
function deptGroup(d: string): string {
  const m = d.match(/^(\d+)/)
  return m ? m[1] : d
}

export default function Teams(): JSX.Element {
  const { tenantId, connected, account, dry, demo, setStatus } = useApp()
  const [users, setUsers] = useState<TpUser[]>([])
  const [teamName, setTeamName] = useState('')
  const [isClass, setIsClass] = useState(true)
  const [pop, setPop] = useState<Pop>('year')
  const [group, setGroup] = useState('')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      setMembers([])
      setSel(new Set())
      setTeamName('')
      setStats(null)
      return
    }
    api
      .invoke<TpUser[]>('team:users', { tenantId })
      .then((list) => {
        setUsers(list)
        setStatus({ text: `Loaded ${list.length} enabled users.`, tone: 'ok' })
      })
      .catch((e) => setStatus({ text: `Failed to load users: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of users) {
      const g = deptGroup(u.department)
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => {
      const na = Number(a)
      const nb = Number(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      if (!isNaN(na)) return -1
      if (!isNaN(nb)) return 1
      return a.localeCompare(b)
    })
  }, [users])

  useEffect(() => {
    if (groups.length && !group) setGroup(groups[0][0])
  }, [groups, group])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const have = new Set(members.map((m) => m.id))
    return users
      .filter(
        (u) =>
          !have.has(u.id) &&
          (u.displayName.toLowerCase().includes(q) ||
            u.userPrincipalName.toLowerCase().includes(q))
      )
      .slice(0, 30)
  }, [search, users, members])

  function loadStudents(): void {
    const picked = users.filter((u) => deptGroup(u.department) === group)
    const rows: Member[] = picked.map((u) => ({ ...u, isOwner: false, status: 'Pending' }))
    setMembers(rows)
    setSel(new Set(rows.map((r) => r.id)))
    setStats(null)
  }

  function addDirect(u: TpUser): void {
    if (members.some((m) => m.id === u.id)) return
    setMembers((prev) => [...prev, { ...u, isOwner: false, status: 'Pending' }])
    setSel((prev) => new Set(prev).add(u.id))
    setStats(null)
  }

  function toggle(id: string): void {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleOwner(id: string): void {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, isOwner: !m.isOwner } : m)))
  }

  const canCreate = !!teamName.trim() && sel.size > 0 && !running

  async function create(): Promise<void> {
    const targets = members.filter((m) => sel.has(m.id))
    if (!teamName.trim() || targets.length === 0) return

    if (!dry && !demo) {
      const ok = window.confirm(
        `Create ${isClass ? 'class' : 'standard'} team "${teamName.trim()}" with ${targets.length} member(s)?`
      )
      if (!ok) return
    }

    setRunning(true)
    setStats(null)
    setMembers((prev) => prev.map((m) => (sel.has(m.id) ? { ...m, status: 'Pending' } : m)))
    setStatus({ text: `Creating team "${teamName.trim()}"…`, tone: 'dim' })

    const res = await api.invoke<{ ok: boolean; teamId?: string; err?: string }>('team:create', {
      tenantId,
      teamName: teamName.trim(),
      template: isClass ? 'educationClass' : 'standard',
      adminUpn: account,
      memberCount: targets.length
    })

    if (!res.ok || !res.teamId) {
      setRunning(false)
      setStats({ created: false, added: 0, failed: 0 })
      setStatus({ text: `Team creation failed: ${res.err ?? 'unknown error'}`, tone: 'bad' })
      return
    }

    let added = 0
    let failed = 0
    for (const m of targets) {
      const r = await api.invoke<{ ok: boolean; err?: string }>('team:addMember', {
        tenantId,
        teamId: res.teamId,
        upn: m.userPrincipalName,
        name: m.displayName,
        isOwner: m.isOwner
      })
      if (r.ok) added++
      else failed++
      setMembers((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, status: r.ok ? 'Added' : 'Failed' } : x))
      )
    }

    setRunning(false)
    setStats({ created: true, added, failed })
    setStatus({
      text: `Team created — ${added} added, ${failed} failed.`,
      tone: failed > 0 ? 'warn' : 'ok'
    })
  }

  return (
    <div className="tool">
      <div className="tool-side">
        <div style={{ padding: 16, overflowY: 'auto' }}>
          <div className="label">TEAM NAME</div>
          <input
            type="text"
            placeholder="e.g. Year 10 Science"
            value={teamName}
            disabled={!connected}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <div className="label" style={{ marginTop: 14 }}>
            TEAM TYPE
          </div>
          <label className="check" style={{ marginBottom: 4 }}>
            <input type="radio" checked={isClass} onChange={() => setIsClass(true)} />
            Class Team
          </label>
          <label className="check">
            <input type="radio" checked={!isClass} onChange={() => setIsClass(false)} />
            Standard Team
          </label>

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <div className="label">POPULATION</div>
          <label className="check" style={{ marginBottom: 4 }}>
            <input type="radio" checked={pop === 'year'} onChange={() => setPop('year')} />
            Year Group
          </label>
          <label className="check" style={{ marginBottom: 8 }}>
            <input type="radio" checked={pop === 'direct'} onChange={() => setPop('direct')} />
            Direct Users
          </label>

          {pop === 'year' && (
            <>
              <select
                value={group}
                disabled={!groups.length}
                onChange={(e) => setGroup(e.target.value)}
              >
                {groups.map(([g, c]) => (
                  <option key={g} value={g}>
                    {isNaN(Number(g)) ? g : `Year ${g}`} — {c} users
                  </option>
                ))}
              </select>
              <button
                className="btn-grey"
                style={{ width: '100%', marginTop: 8 }}
                disabled={!groups.length}
                onClick={loadStudents}
              >
                Load Students
              </button>
            </>
          )}

          {pop === 'direct' && (
            <>
              <input
                type="text"
                placeholder="Search users to add…"
                value={search}
                disabled={!connected}
                onChange={(e) => setSearch(e.target.value)}
              />
              {matches.length > 0 && (
                <div className="tool-list" style={{ maxHeight: 200, marginTop: 4 }}>
                  {matches.map((u) => (
                    <div key={u.id} className="row clickable" onClick={() => addDirect(u)}>
                      <div>{u.displayName}</div>
                      <div className="upn">{u.userPrincipalName}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="row-inline" style={{ justifyContent: 'space-between', margin: '10px 0' }}>
            <span className="muted">
              {members.length ? `${sel.size} of ${members.length} members` : ''}
            </span>
            <span className="row-inline">
              <button
                className="btn-grey btn-sm"
                disabled={!members.length}
                onClick={() => setSel(new Set(members.map((m) => m.id)))}
              >
                All
              </button>
              <button
                className="btn-grey btn-sm"
                disabled={!members.length}
                onClick={() => setSel(new Set())}
              >
                None
              </button>
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <div className="label">ACTIONS</div>
          <button
            className="btn-accent"
            style={{ width: '100%' }}
            disabled={!canCreate}
            onClick={create}
          >
            {dry ? 'Create Team (Dry Run)' : 'Create Team'}
          </button>

          {stats && (
            <div className="card mono" style={{ marginTop: 14 }}>
              <div className={stats.created ? 'ok' : 'bad'}>
                Team   {stats.created ? 'Created' : 'FAILED'}
              </div>
              <div className="ok">Added  {stats.added}</div>
              <div className={stats.failed ? 'bad' : 'dim'}>Failed {stats.failed}</div>
            </div>
          )}
        </div>
      </div>

      <div className="tool-main" style={{ padding: 0 }}>
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 34 }}></th>
              <th>Display Name</th>
              <th>Username (UPN)</th>
              <th>Department</th>
              <th style={{ width: 70 }}>Owner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="clickable" onClick={() => toggle(m.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
                </td>
                <td>{m.displayName}</td>
                <td>{m.userPrincipalName}</td>
                <td>{m.department}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={m.isOwner} onChange={() => toggleOwner(m.id)} />
                </td>
                <td>
                  <span
                    className={m.status === 'Added' ? 'ok' : m.status === 'Failed' ? 'bad' : 'muted'}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="muted" style={{ padding: '28px 32px' }}>
            Choose a population mode and add members, then create the team.
          </p>
        )}
      </div>
    </div>
  )
}
