import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import { newPassword } from '../password'

type YgUser = { id: string; displayName: string; userPrincipalName: string; department: string }
type Row = YgUser & { password: string; status: 'Pending' | 'OK' | 'Failed' }

// "10A" → 10, "Staff" → "Staff" — the year-group anchor.
function deptGroup(d: string): string {
  const m = d.match(/^(\d+)/)
  return m ? m[1] : d
}

export default function YearGroup(): JSX.Element {
  const { tenantId, connected, dry: globalDry, setStatus } = useApp()
  const [users, setUsers] = useState<YgUser[]>([])
  const [group, setGroup] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [live, setLive] = useState(false)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<{ total: number; ok: number; failed: number } | null>(null)

  useEffect(() => {
    if (!connected || !tenantId) {
      setUsers([])
      setRows([])
      setGroup('')
      return
    }
    api
      .invoke<YgUser[]>('yg:users', { tenantId })
      .then((list) => {
        setUsers(list)
        setStatus({ text: `Loaded ${list.length} enabled users with departments.`, tone: 'ok' })
      })
      .catch((e) => setStatus({ text: `Failed to load users: ${String(e)}`, tone: 'bad' }))
  }, [tenantId, connected])

  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of users) counts.set(deptGroup(u.department), (counts.get(deptGroup(u.department)) ?? 0) + 1)
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

  function loadStudents(): void {
    const students = users.filter((u) => deptGroup(u.department) === group)
    const r: Row[] = students.map((u) => ({ ...u, password: '', status: 'Pending' }))
    setRows(r)
    setSel(new Set(r.map((x) => x.id)))
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

  const liveActive = live && !globalDry

  async function run(): Promise<void> {
    const targets = rows.filter((r) => sel.has(r.id))
    if (targets.length === 0) return

    if (liveActive) {
      const ok = window.confirm(
        `Reset passwords for ${targets.length} selected student(s)?\n\nThis cannot be undone.`
      )
      if (!ok) return
    }

    // Generate passwords up front (shown in the grid immediately).
    const pwById = new Map<string, string>()
    setRows((prev) =>
      prev.map((r) => {
        if (!sel.has(r.id)) return r
        const pw = newPassword()
        pwById.set(r.id, pw)
        return { ...r, password: pw, status: 'Pending' }
      })
    )

    if (!liveActive) {
      setRows((prev) => prev.map((r) => (sel.has(r.id) ? { ...r, status: 'OK' } : r)))
      setStats({ total: targets.length, ok: targets.length, failed: 0 })
      setStatus({ text: `Dry run complete — ${targets.length} passwords generated.`, tone: 'ok' })
      return
    }

    setRunning(true)
    let ok = 0
    let failed = 0
    for (const t of targets) {
      const pw = pwById.get(t.id) ?? newPassword()
      const res = await api.invoke<{ ok: boolean; err?: string }>('yg:resetOne', {
        tenantId,
        id: t.id,
        name: t.displayName,
        upn: t.userPrincipalName,
        pw
      })
      if (res.ok) ok++
      else failed++
      setRows((prev) =>
        prev.map((r) => (r.id === t.id ? { ...r, status: res.ok ? 'OK' : 'Failed' } : r))
      )
    }
    setRunning(false)
    setStats({ total: ok + failed, ok, failed })
    setStatus({
      text: `Live run complete — ${ok} OK, ${failed} failed.`,
      tone: failed > 0 ? 'warn' : 'ok'
    })
  }

  function exportCsv(): void {
    const esc = (s: string): string => `"${s.replace(/"/g, '""')}"`
    const header = 'DisplayName,UPN,Department,Password,Status'
    const lines = rows.map((r) =>
      [r.displayName, r.userPrincipalName, r.department, r.password, r.status].map(esc).join(',')
    )
    const blob = new Blob([[header, ...lines].join('\r\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PasswordReset_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ text: 'CSV exported.', tone: 'ok' })
  }

  const exportable = rows.some((r) => r.password)

  return (
    <div className="tool">
      <div className="tool-side">
        <div style={{ padding: 16, overflowY: 'auto' }}>
          <div className="label">YEAR GROUP</div>
          <select value={group} disabled={!groups.length} onChange={(e) => setGroup(e.target.value)}>
            {groups.map(([g, c]) => (
              <option key={g} value={g}>
                {isNaN(Number(g)) ? g : `Year ${g}`} — {c} students
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

          <div className="row-inline" style={{ justifyContent: 'space-between', margin: '10px 0' }}>
            <span className="muted">{rows.length ? `${sel.size} of ${rows.length} selected` : ''}</span>
            <span className="row-inline">
              <button
                className="btn-grey btn-sm"
                disabled={!rows.length}
                onClick={() => setSel(new Set(rows.map((r) => r.id)))}
              >
                All
              </button>
              <button className="btn-grey btn-sm" disabled={!rows.length} onClick={() => setSel(new Set())}>
                None
              </button>
            </span>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <div className="label">RUN MODE</div>
          <label className="check" style={{ marginBottom: 4 }}>
            <input type="radio" checked={!live} onChange={() => setLive(false)} />
            Dry Run (preview only)
          </label>
          <label className="check">
            <input type="radio" checked={live} onChange={() => setLive(true)} />
            <span className="bad">Live Run (reset passwords)</span>
          </label>

          {liveActive && (
            <div className="warn-box">
              <div className="bad" style={{ fontWeight: 700 }}>Warning</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Passwords will be changed in Entra ID immediately.
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <div className="label">ACTIONS</div>
          <button
            className={liveActive ? 'btn-danger' : 'btn-accent'}
            style={{ width: '100%' }}
            disabled={!sel.size || running}
            onClick={run}
          >
            {liveActive ? 'Reset Passwords Now' : 'Generate Passwords'}
          </button>
          <button
            className="btn-grey"
            style={{ width: '100%', marginTop: 8 }}
            disabled={!exportable}
            onClick={exportCsv}
          >
            Export CSV
          </button>

          {stats && (
            <div className="card mono" style={{ marginTop: 14 }}>
              <div className="dim">Total  {stats.total}</div>
              <div className="ok">OK     {stats.ok}</div>
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
              <th>Form</th>
              <th>Generated Password</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => toggle(r.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td>{r.displayName}</td>
                <td>{r.userPrincipalName}</td>
                <td>{r.department}</td>
                <td className="mono ok">{r.password}</td>
                <td>
                  <span
                    className={r.status === 'OK' ? 'ok' : r.status === 'Failed' ? 'bad' : 'muted'}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="muted" style={{ padding: '28px 32px' }}>
            Pick a year group and click Load Students.
          </p>
        )}
      </div>
    </div>
  )
}
