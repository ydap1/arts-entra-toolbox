import { useEffect, useState } from 'react'
import UserPicker from '../components/UserPicker'
import { api } from '../api'
import { useApp } from '../store'
import { newPassword } from '../password'
import type { GraphUser } from '../types'

type Tab = 'reset' | 'groups'
type Group = { displayName: string; type: string }
type Inline = { text: string; tone: 'ok' | 'bad' } | null

export default function UserPasswordReset(): JSX.Element {
  const { tenantId, connected, dry, setStatus } = useApp()
  const [user, setUser] = useState<GraphUser | null>(null)
  const [tab, setTab] = useState<Tab>('reset')

  const [pw, setPw] = useState('')
  const [reveal, setReveal] = useState(false)
  const [force, setForce] = useState(false)
  const [prompt, setPrompt] = useState<{ text: string; tone: 'ok' | 'bad' | 'warn' | 'dim' }>({
    text: '',
    tone: 'dim'
  })
  const [inline, setInline] = useState<Inline>(null)
  const [busy, setBusy] = useState(false)

  const [groups, setGroups] = useState<Group[] | null>(null)
  const [grpFilter, setGrpFilter] = useState('')

  function selectUser(u: GraphUser): void {
    setUser(u)
    setPw(newPassword())
    setReveal(false)
    setForce(false)
    setInline(null)
    setGroups(null)
    setGrpFilter('')
    setPrompt({ text: 'Checking…', tone: 'dim' })
  }

  // Load current forceChangePasswordNextSignIn + group memberships on selection.
  useEffect(() => {
    if (!user || !tenantId) return
    let cancelled = false
    api
      .invoke<{ force: boolean }>('upr:profile', { tenantId, id: user.id })
      .then((r) => {
        if (cancelled) return
        setPrompt(
          r.force
            ? { text: 'Currently: will prompt on next sign-in', tone: 'warn' }
            : { text: 'Currently: no prompt required', tone: 'ok' }
        )
      })
      .catch(() => !cancelled && setPrompt({ text: 'Could not read current status', tone: 'dim' }))
    api
      .invoke<Group[]>('upr:groups', { tenantId, id: user.id })
      .then((g) => !cancelled && setGroups(g))
      .catch(() => !cancelled && setGroups([]))
    return () => {
      cancelled = true
    }
  }, [user, tenantId])

  async function reset(): Promise<void> {
    if (!user || !tenantId) return
    const value = pw.trim()
    if (!value) {
      setInline({ text: 'Password cannot be empty.', tone: 'bad' })
      return
    }
    setBusy(true)
    setInline(null)
    setStatus({ text: `Resetting password for ${user.displayName}…`, tone: 'dim' })
    try {
      await api.invoke('upr:reset', {
        tenantId,
        id: user.id,
        upn: user.userPrincipalName,
        name: user.displayName,
        pw: value,
        force
      })
      const label = force ? 'will prompt on next sign-in' : 'no prompt required'
      setInline({
        text: dry
          ? `[DRY] Would reset password (${label}).`
          : `Password reset successfully. (${label})`,
        tone: 'ok'
      })
      setStatus({ text: `Password reset for ${user.displayName}.`, tone: dry ? 'warn' : 'ok' })
      if (!dry)
        setPrompt(
          force
            ? { text: 'Currently: will prompt on next sign-in', tone: 'warn' }
            : { text: 'Currently: no prompt required', tone: 'ok' }
        )
    } catch (err) {
      setInline({ text: `Reset failed: ${String(err)}`, tone: 'bad' })
      setStatus({ text: `Reset failed for ${user.displayName}.`, tone: 'bad' })
    } finally {
      setBusy(false)
    }
  }

  const shownGroups = (groups ?? []).filter((g) =>
    g.displayName.toLowerCase().includes(grpFilter.trim().toLowerCase())
  )

  return (
    <div className="tool">
      <UserPicker selectedId={user?.id ?? null} onSelect={selectUser} />
      <div className="tool-main" style={{ padding: 0 }}>
        <div className="upr-tabs">
          <button className={tab === 'reset' ? 'tab sel' : 'tab'} onClick={() => setTab('reset')}>
            Reset
          </button>
          <button className={tab === 'groups' ? 'tab sel' : 'tab'} onClick={() => setTab('groups')}>
            Groups
          </button>
        </div>

        {!user && <p className="muted" style={{ padding: '28px 32px' }}>Select a user on the left to reset their password.</p>}

        {user && tab === 'reset' && (
          <div style={{ padding: '24px 32px', maxWidth: 540 }}>
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{user.displayName}</div>
              <div className="dim" style={{ marginTop: 3 }}>{user.userPrincipalName}</div>
            </div>

            <div className="label">CURRENT SIGN-IN PROMPT STATUS</div>
            <div className="card">
              <span className={prompt.tone}>{prompt.text}</span>
            </div>

            <div className="label">NEW PASSWORD</div>
            <div className="row-inline" style={{ marginBottom: 6 }}>
              <input
                type={reveal ? 'text' : 'password'}
                className="mono"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <button className="btn-grey" onClick={() => setReveal((v) => !v)}>
                {reveal ? 'Hide' : 'Show'}
              </button>
              <button className="btn-grey" onClick={() => { setPw(newPassword()); setReveal(false) }}>
                Regenerate
              </button>
            </div>
            <div className="muted" style={{ marginBottom: 20, fontSize: 11 }}>
              You can edit the password above before resetting.
            </div>

            <div className="label">SIGN-IN PROMPT AFTER RESET</div>
            <label className="check" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Force password change on next sign-in
            </label>
            <div className="muted" style={{ marginBottom: 22, fontSize: 11 }}>
              When checked, the user must set a new password on their next login.
            </div>

            <button
              className="btn-indigo"
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
              disabled={!connected || busy}
              onClick={reset}
            >
              {dry ? 'Reset Password (Dry Run)' : 'Reset Password'}
            </button>

            {inline && (
              <div className={inline.tone} style={{ marginTop: 12, fontSize: 12 }}>
                {inline.text}
              </div>
            )}
          </div>
        )}

        {user && tab === 'groups' && (
          <div style={{ padding: '20px 24px' }}>
            {groups === null && <p className="muted">Loading groups…</p>}
            {groups !== null && groups.length === 0 && (
              <p className="muted">No group memberships found.</p>
            )}
            {groups !== null && groups.length > 0 && (
              <>
                <div className="dim" style={{ marginBottom: 8 }}>
                  {groups.length} group membership{groups.length !== 1 ? 's' : ''}
                </div>
                <input
                  type="text"
                  placeholder="Filter groups…"
                  value={grpFilter}
                  onChange={(e) => setGrpFilter(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <table className="grid">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownGroups.map((g, i) => (
                      <tr key={i}>
                        <td>{g.displayName}</td>
                        <td className="muted">{g.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
