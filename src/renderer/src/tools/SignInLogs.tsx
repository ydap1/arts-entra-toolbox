import { useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import UserPicker from '../components/UserPicker'
import type { GraphUser } from '../types'

type SignInRow = {
  dateTime: string
  application: string
  result: string
  failed: boolean
  ipAddress: string
  location: string
  device: string
}

export default function SignInLogs(): JSX.Element {
  const { tenantId, setStatus } = useApp()
  const [picked, setPicked] = useState<GraphUser | null>(null)
  const [rows, setRows] = useState<SignInRow[]>([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('Select a user on the left to view their sign-in history.')

  function select(u: GraphUser): void {
    setPicked(u)
    setRows([])
    setLoading(true)
    setNote('Loading sign-in logs…')
    api
      .invoke<SignInRow[]>('sl:logs', { tenantId, userId: u.id })
      .then((logs) => {
        setRows(logs)
        if (logs.length === 0) setNote('No sign-in records found for this user.')
        setStatus({ text: `Loaded ${logs.length} sign-in record(s).`, tone: 'ok' })
      })
      .catch((e) => {
        const msg = String(e)
        setNote(
          msg.includes('403')
            ? 'Permission denied — reconnect the tenant to grant AuditLog.Read.All access.'
            : `Error: ${msg}`
        )
        setStatus({ text: `Sign-in log error: ${msg}`, tone: 'bad' })
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="tool">
      <UserPicker selectedId={picked?.id ?? null} onSelect={select} />
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {rows.length === 0 || loading ? (
          <p className="muted" style={{ padding: '28px 32px' }}>
            {note}
          </p>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Application</th>
                <th>Result</th>
                <th>IP Address</th>
                <th>Location</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r.dateTime}</td>
                  <td>{r.application}</td>
                  <td>
                    <span className={r.failed ? 'bad' : 'ok'}>{r.result}</span>
                  </td>
                  <td className="mono">{r.ipAddress}</td>
                  <td>{r.location}</td>
                  <td>{r.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
