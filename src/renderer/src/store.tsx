import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode
} from 'react'
import { api } from './api'
import type { Tenant } from './types'

export type StatusTone = 'dim' | 'ok' | 'bad' | 'warn'
export type Status = { text: string; tone: StatusTone }

type AppState = {
  tenants: Tenant[]
  tenantId: string | null
  connected: boolean
  account: string
  tenantName: string
  dry: boolean
  demo: boolean
  busy: boolean
  status: Status
  nav: string
  logOpen: boolean
  logLines: { line: string; color: string }[]

  setNav: (n: string) => void
  setStatus: (s: Status) => void
  refreshTenants: () => Promise<void>
  selectTenant: (id: string) => Promise<void>
  addTenant: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>
  removeTenant: (id: string) => Promise<void>
  disconnect: () => Promise<void>
  startDemo: () => Promise<void>
  toggleDry: () => Promise<void>
  toggleLog: () => void
  clearLog: () => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [dry, setDry] = useState(false)
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>({
    text: 'Ready — select a tenant to begin',
    tone: 'dim'
  })
  const [nav, setNav] = useState('YearGroup')
  const [logOpen, setLogOpen] = useState(false)
  const [logLines, setLogLines] = useState<{ line: string; color: string }[]>([])

  useEffect(() => {
    const off = api.onLog((line, color) =>
      setLogLines((prev) => [...prev.slice(-499), { line, color }])
    )
    return off
  }, [])

  const refreshTenants = useCallback(async () => {
    setTenants(await api.listTenants())
  }, [])

  const selectTenant = useCallback(async (id: string) => {
    setBusy(true)
    setConnected(false)
    setTenantId(id)
    setDemo(false)
    await api.setDemo(false)
    setStatus({ text: 'Authenticating — a browser window may open…', tone: 'dim' })
    try {
      const res = await api.connect(id)
      setConnected(true)
      setAccount(res.account)
      const name = await api.tenantDisplayName(id)
      setTenantName(name)
      await api.setSetting('LastTenantId', id)
      setStatus({
        text: `Connected as ${res.account} (${res.mode} auth, cache ${
          res.cachePersisted ? 'persisted' : 'in-memory only'
        }).`,
        tone: 'ok'
      })
    } catch (err) {
      setStatus({ text: `Authentication failed: ${String(err)}`, tone: 'bad' })
    } finally {
      setBusy(false)
    }
  }, [])

  const addTenant = useCallback(
    async (id: string, name: string): Promise<{ ok: boolean; error?: string }> => {
      setBusy(true)
      setStatus({ text: 'Authenticating…', tone: 'dim' })
      try {
        const res = await api.connect(id)
        await api.saveTenant(id, name)
        await refreshTenants()
        setTenantId(id)
        setConnected(true)
        setDemo(false)
        setAccount(res.account)
        const dn = await api.tenantDisplayName(id)
        setTenantName(dn || name)
        await api.setSetting('LastTenantId', id)
        setStatus({ text: `Connected as ${res.account}.`, tone: 'ok' })
        return { ok: true }
      } catch (err) {
        setStatus({ text: `Authentication failed: ${String(err)}`, tone: 'bad' })
        return { ok: false, error: String(err) }
      } finally {
        setBusy(false)
      }
    },
    [refreshTenants]
  )

  const removeTenant = useCallback(
    async (id: string) => {
      await api.removeTenant(id)
      await refreshTenants()
      if (tenantId === id) {
        setConnected(false)
        setTenantId(null)
        setTenantName('')
      }
      setStatus({ text: 'Tenant removed.', tone: 'dim' })
    },
    [refreshTenants, tenantId]
  )

  const disconnect = useCallback(async () => {
    if (tenantId) await api.disconnect(tenantId)
    if (demo) await api.setDemo(false)
    setConnected(false)
    setDemo(false)
    setTenantId(null)
    setTenantName('')
    setAccount('')
    setStatus({ text: 'Signed out. Select a tenant to reconnect.', tone: 'dim' })
  }, [tenantId, demo])

  const startDemo = useCallback(async () => {
    await api.setDemo(true)
    setDemo(true)
    setConnected(true)
    setTenantId('DEMO')
    setAccount('demo@contoso-academy.edu')
    setTenantName('Contoso Academy')
    setStatus({ text: 'Demo mode — Contoso Academy (fake data).', tone: 'warn' })
  }, [])

  const toggleDry = useCallback(async () => {
    const on = await api.setDry(!dry)
    setDry(on)
    setStatus(
      on
        ? { text: 'DRY RUN ACTIVE — no changes will be made.', tone: 'warn' }
        : { text: 'Ready.', tone: 'dim' }
    )
  }, [dry])

  const toggleLog = useCallback(() => setLogOpen((v) => !v), [])
  const clearLog = useCallback(() => setLogLines([]), [])

  // Initial load: tenants + last-used tenant auto-select.
  useEffect(() => {
    ;(async () => {
      const list = await api.listTenants()
      setTenants(list)
      if (list.length) {
        const last = await api.getSetting<string>('LastTenantId')
        const pick = list.find((t) => t.tenantId === last) ?? list[0]
        setTenantId(pick.tenantId)
        setTenantName(pick.displayName)
      } else {
        setStatus({ text: 'No tenants saved. Click + to add one.', tone: 'dim' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: AppState = {
    tenants,
    tenantId,
    connected,
    account,
    tenantName,
    dry,
    demo,
    busy,
    status,
    nav,
    logOpen,
    logLines,
    setNav,
    setStatus,
    refreshTenants,
    selectTenant,
    addTenant,
    removeTenant,
    disconnect,
    startDemo,
    toggleDry,
    toggleLog,
    clearLog
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
