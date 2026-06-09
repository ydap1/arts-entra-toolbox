// Typed wrapper over the preload `bridge`. Each method names its IPC channel;
// the main process holds the matching ipcMain.handle.

import type { Tenant, ConnectResult, GraphUser } from './types'

type BridgeShape = {
  invoke: (channel: string, payload?: unknown) => Promise<unknown>
  onLog: (cb: (line: string, color: string) => void) => () => void
}

const bridge = (window as unknown as { bridge: BridgeShape }).bridge

const call = <T>(channel: string, payload?: unknown): Promise<T> =>
  bridge.invoke(channel, payload) as Promise<T>

export const api = {
  // Modes
  setDry: (on: boolean) => call<boolean>('mode:setDry', on),
  setDemo: (on: boolean) => call<boolean>('mode:setDemo', on),
  getModes: () => call<{ dry: boolean; demo: boolean }>('mode:get'),

  // Tenants / settings
  listTenants: () => call<Tenant[]>('tenants:list'),
  saveTenant: (tenantId: string, displayName: string) =>
    call<void>('tenants:save', { tenantId, displayName }),
  removeTenant: (tenantId: string) => call<void>('tenants:remove', tenantId),
  getSetting: <T>(name: string) => call<T | null>('settings:get', name),
  setSetting: (name: string, value: unknown) => call<void>('settings:set', { name, value }),

  // Auth
  connect: (tenantId: string) => call<ConnectResult>('tenant:connect', tenantId),
  disconnect: (tenantId: string) => call<void>('tenant:disconnect', tenantId),
  tenantDisplayName: (tenantId: string) => call<string>('tenant:displayName', tenantId),

  // Shared
  listUsers: (tenantId: string) => call<GraphUser[]>('users:listEnabled', tenantId),

  // Generic escape hatch for tool channels (typed at call site)
  invoke: <T>(channel: string, payload?: unknown) => call<T>(channel, payload),

  onLog: (cb: (line: string, color: string) => void) => bridge.onLog(cb)
}
