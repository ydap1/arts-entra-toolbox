import { useEffect, useState, type ReactNode } from 'react'
import UserPicker from '../components/UserPicker'
import { api } from '../api'
import { useApp } from '../store'
import type { GraphUser } from '../types'

type Delegate = { id: string; displayName: string; userPrincipalName: string }

type EwsDelegate = {
  email: string
  displayName: string
  inbox: string
  calendar: string
  contacts: string
  tasks: string
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function PermTag({ level }: { level: string }): JSX.Element {
  const cls = level === 'None' ? 'muted' : level === 'Reviewer' ? 'dim' : 'accent'
  return <span className={cls} style={{ fontSize: 11 }}>{level}</span>
}

export default function MailboxDelegation(): JSX.Element {
  const { tenantId, connected, dry, setStatus } = useApp()
  const [user, setUser] = useState<GraphUser | null>(null)
  const [allUsers, setAllUsers] = useState<GraphUser[]>([])

  // Send on Behalf (Graph publicDelegates)
  const [delegates, setDelegates] = useState<Delegate[] | null>(null)
  const [delegateSearch, setDelegateSearch] = useState('')
  const [delegateBusy, setDelegateBusy] = useState(false)

  // Read and Manage (EWS delegate)
  const [fullAccess, setFullAccess] = useState<EwsDelegate[] | null>(null)
  const [addEmail, setAddEmail] = useState('')
  const [fullBusy, setFullBusy] = useState(false)

  useEffect(() => {
    if (!connected || !tenantId) { setAllUsers([]); return }
    api.listUsers(tenantId).then(setAllUsers).catch(() => setAllUsers([]))
  }, [tenantId, connected])

  function loadDelegates(): void {
    if (!user || !tenantId) return
    setDelegates(null)
    api
      .invoke<Delegate[]>('mbx:sendOnBehalf', { tenantId, userId: user.id })
      .then(setDelegates)
      .catch((e) => {
        setDelegates([])
        setStatus({ text: `Could not load delegates: ${String(e)}`, tone: 'warn' })
      })
  }

  function loadFullAccess(): void {
    if (!user || !tenantId) return
    setFullAccess(null)
    api
      .invoke<EwsDelegate[]>('mbx:fullAccess', { tenantId, ownerUpn: user.userPrincipalName })
      .then(setFullAccess)
      .catch((e) => {
        setFullAccess([])
        setStatus({ text: `Could not load delegates: ${String(e)}`, tone: 'warn' })
      })
  }

  function selectUser(u: GraphUser): void {
    setUser(u)
    setDelegates(null)
    setFullAccess(null)
    setDelegateSearch('')
    setAddEmail('')
  }

  useEffect(() => {
    if (!user) return
    loadDelegates()
    loadFullAccess()
  }, [user?.id, tenantId])

  // ── Send on Behalf actions ─────────────────────────────────────────────────
  async function addDelegate(u: GraphUser): Promise<void> {
    if (!user || !tenantId) return
    setDelegateBusy(true)
    setStatus({ text: `Adding ${u.displayName} as Send on Behalf delegate…`, tone: 'dim' })
    try {
      const res = await api.invoke<{ ok: boolean; dry: boolean }>(
        'mbx:addSendOnBehalf', { tenantId, userId: user.id, delegateId: u.id }
      )
      setStatus({
        text: res.dry
          ? `[DRY] Would add ${u.displayName} as delegate.`
          : `${u.displayName} added as delegate.`,
        tone: res.dry ? 'warn' : 'ok'
      })
      if (!res.dry) loadDelegates()
      setDelegateSearch('')
    } catch (err) {
      setStatus({ text: `Failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setDelegateBusy(false)
    }
  }

  async function removeDelegate(d: Delegate): Promise<void> {
    if (!user || !tenantId) return
    setDelegateBusy(true)
    setStatus({ text: `Removing ${d.displayName} as delegate…`, tone: 'dim' })
    try {
      const res = await api.invoke<{ ok: boolean; dry: boolean }>(
        'mbx:removeSendOnBehalf', { tenantId, userId: user.id, delegateId: d.id }
      )
      setStatus({
        text: res.dry ? '[DRY] Would remove delegate.' : 'Delegate removed.',
        tone: res.dry ? 'warn' : 'ok'
      })
      if (!res.dry) setDelegates((prev) => prev?.filter((x) => x.id !== d.id) ?? null)
    } catch (err) {
      setStatus({ text: `Failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setDelegateBusy(false)
    }
  }

  // ── Read and Manage (EWS) actions ──────────────────────────────────────────
  async function addFullAccess(): Promise<void> {
    if (!user || !tenantId || !addEmail.trim()) return
    setFullBusy(true)
    setStatus({ text: `Adding ${addEmail.trim()} as delegate on ${user.displayName}'s mailbox…`, tone: 'dim' })
    try {
      const res = await api.invoke<{ ok: boolean; dry: boolean }>(
        'mbx:addFullAccess', { tenantId, ownerUpn: user.userPrincipalName, delegateEmail: addEmail.trim() }
      )
      setStatus({
        text: res.dry
          ? `[DRY] Would add ${addEmail.trim()} as full delegate.`
          : `${addEmail.trim()} added as delegate (Inbox + Calendar + Contacts).`,
        tone: res.dry ? 'warn' : 'ok'
      })
      if (!res.dry) loadFullAccess()
      setAddEmail('')
    } catch (err) {
      setStatus({ text: `Failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setFullBusy(false)
    }
  }

  async function removeFullAccess(d: EwsDelegate): Promise<void> {
    if (!user || !tenantId) return
    setFullBusy(true)
    setStatus({ text: `Removing ${d.displayName} as delegate…`, tone: 'dim' })
    try {
      const res = await api.invoke<{ ok: boolean; dry: boolean }>(
        'mbx:removeFullAccess', { tenantId, ownerUpn: user.userPrincipalName, delegateEmail: d.email }
      )
      setStatus({
        text: res.dry ? '[DRY] Would remove delegate.' : 'Delegate removed.',
        tone: res.dry ? 'warn' : 'ok'
      })
      if (!res.dry) setFullAccess((prev) => prev?.filter((x) => x.email !== d.email) ?? null)
    } catch (err) {
      setStatus({ text: `Failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setFullBusy(false)
    }
  }

  const existingDelegateIds = new Set((delegates ?? []).map((d) => d.id))
  const searchResults = delegateSearch.trim()
    ? allUsers
        .filter((u) => {
          const q = delegateSearch.toLowerCase()
          return (
            (u.displayName.toLowerCase().includes(q) ||
              u.userPrincipalName.toLowerCase().includes(q)) &&
            !existingDelegateIds.has(u.id) &&
            u.id !== user?.id
          )
        })
        .slice(0, 6)
    : []

  return (
    <div className="tool">
      <UserPicker selectedId={user?.id ?? null} onSelect={selectUser} heading="MAILBOX OWNER" />

      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px' }}>
        {!user && <p className="muted">Select the mailbox owner on the left.</p>}

        {user && (
          <>
            {/* ── Send As ───────────────────────────────────────────────────── */}
            <Section title="Send As (0)">
              <p className="dim" style={{ fontSize: 12, margin: '0 0 10px' }}>
                The Send As permission allows the delegate to send an email from this mailbox.
                The message will appear to have been sent directly from the mailbox owner with no indication of a delegate.
              </p>
              <div style={{
                border: '1px solid var(--warning)',
                background: 'rgba(251,191,36,0.06)',
                borderRadius: 6,
                padding: '9px 12px',
                fontSize: 12,
                color: 'var(--warning)'
              }}>
                ⚠ Send As is an Exchange-level permission and cannot be configured via any Microsoft API.
                It must be set in Exchange Admin Center.
              </div>
              <button
                className="btn-grey btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => api.invoke('shell:openExternal', 'https://admin.exchange.microsoft.com')}
              >
                Open Exchange Admin Center →
              </button>
            </Section>

            {/* ── Send on Behalf ────────────────────────────────────────────── */}
            <Section title={`Send on Behalf (${delegates?.length ?? '…'})`}>
              <p className="dim" style={{ fontSize: 12, margin: '0 0 10px' }}>
                The Send on Behalf permission allows the delegate to send email on behalf of this mailbox.
                The From line will indicate the message was sent by the delegate on behalf of the mailbox owner.
              </p>

              {delegates === null && <p className="muted" style={{ fontSize: 12 }}>Loading…</p>}
              {delegates?.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No delegates configured.</p>}
              {delegates && delegates.length > 0 && (
                <table className="grid" style={{ marginBottom: 12 }}>
                  <tbody>
                    {delegates.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div>{d.displayName}</div>
                          <div className="upn">{d.userPrincipalName}</div>
                        </td>
                        <td style={{ width: 80 }}>
                          <button
                            className="btn-danger btn-sm"
                            disabled={delegateBusy || !connected}
                            onClick={() => removeDelegate(d)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="label" style={{ marginTop: 12 }}>ADD DELEGATE</div>
              <input
                type="text"
                placeholder="Search users…"
                value={delegateSearch}
                disabled={delegateBusy || !connected}
                onChange={(e) => setDelegateSearch(e.target.value)}
                style={{ height: 32, marginBottom: searchResults.length ? 4 : 0 }}
              />
              {searchResults.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)' }}>
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="row"
                      style={{ padding: '7px 10px', cursor: 'pointer' }}
                      onClick={() => addDelegate(u)}
                    >
                      <div>{u.displayName}</div>
                      <div className="upn">{u.userPrincipalName}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Read and Manage (EWS) ─────────────────────────────────────── */}
            <Section title={`Read and Manage (${fullAccess?.length ?? '…'})`}>
              <p className="dim" style={{ fontSize: 12, margin: '0 0 10px' }}>
                Outlook-style full delegate access via Exchange Web Services — grants Editor on Inbox and Calendar,
                Reviewer on Contacts. The delegate can open these folders in Outlook via "Open Other User's Folder."
              </p>

              {fullAccess === null && <p className="muted" style={{ fontSize: 12 }}>Loading… (may open a browser for Exchange consent on first use)</p>}
              {fullAccess?.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No delegates configured.</p>}
              {fullAccess && fullAccess.length > 0 && (
                <table className="grid" style={{ marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th>Delegate</th>
                      <th style={{ width: 70 }}>Inbox</th>
                      <th style={{ width: 70 }}>Calendar</th>
                      <th style={{ width: 70 }}>Contacts</th>
                      <th style={{ width: 70 }}>Tasks</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullAccess.map((d) => (
                      <tr key={d.email}>
                        <td>
                          <div>{d.displayName}</div>
                          <div className="upn">{d.email}</div>
                        </td>
                        <td><PermTag level={d.inbox} /></td>
                        <td><PermTag level={d.calendar} /></td>
                        <td><PermTag level={d.contacts} /></td>
                        <td><PermTag level={d.tasks} /></td>
                        <td>
                          <button
                            className="btn-danger btn-sm"
                            disabled={fullBusy || !connected}
                            onClick={() => removeFullAccess(d)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="label" style={{ marginTop: 12 }}>ADD DELEGATE</div>
              <div className="row-inline">
                <input
                  type="text"
                  placeholder="user@domain.com"
                  value={addEmail}
                  disabled={fullBusy || !connected}
                  onChange={(e) => setAddEmail(e.target.value)}
                  style={{ height: 32 }}
                  onKeyDown={(e) => e.key === 'Enter' && addFullAccess()}
                />
                <button
                  className="btn-indigo btn-sm"
                  disabled={!addEmail.trim() || fullBusy || !connected}
                  onClick={addFullAccess}
                >
                  {dry ? 'Add (Dry)' : 'Add'}
                </button>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
