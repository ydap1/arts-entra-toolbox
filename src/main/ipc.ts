// IPC registration hub. Shell-level handlers live here; each tool registers its
// own handlers via registerXxxTool(). Branches on dry/demo mode like the PS tools.

import { ipcMain } from 'electron'
import { connectTenant, disconnectTenant } from './auth'
import { graphGet, graphPaged } from './graph'
import { mode } from './mode'
import {
  getSavedTenants,
  saveTenant,
  removeSavedTenant,
  updateTenantDisplayName,
  getSetting,
  setSetting
} from './config'
import { demoUsers } from './demo'
import { registerUserPasswordResetTool } from './tools/userPasswordReset'
import { registerYearGroupTool } from './tools/yearGroup'
import { registerBulkUpnTool } from './tools/bulkUpn'
import { registerImmutableIdTool } from './tools/immutableId'
import { registerLastDeviceTool } from './tools/lastDevice'
import { registerSignInLogsTool } from './tools/signInLogs'
import { registerGroupCopyTool } from './tools/groupCopy'
import { registerTeamsTool } from './tools/teams'

export function registerIpc(): void {
  // ── Modes ──────────────────────────────────────────────────────────────────
  ipcMain.handle('mode:setDry', (_e, on: boolean) => (mode.dry = !!on))
  ipcMain.handle('mode:setDemo', (_e, on: boolean) => (mode.demo = !!on))
  ipcMain.handle('mode:get', () => ({ dry: mode.dry, demo: mode.demo }))

  // ── Tenant config ──────────────────────────────────────────────────────────
  ipcMain.handle('tenants:list', () => getSavedTenants())
  ipcMain.handle('tenants:save', (_e, a: { tenantId: string; displayName: string }) =>
    saveTenant(a.tenantId, a.displayName)
  )
  ipcMain.handle('tenants:remove', (_e, tenantId: string) => {
    disconnectTenant(tenantId)
    removeSavedTenant(tenantId)
  })

  // ── Settings ───────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, name: string) => getSetting(name))
  ipcMain.handle('settings:set', (_e, a: { name: string; value: unknown }) =>
    setSetting(a.name, a.value)
  )

  // ── Auth ───────────────────────────────────────────────────────────────────
  ipcMain.handle('tenant:connect', async (_e, tenantId: string) => connectTenant(tenantId))
  ipcMain.handle('tenant:disconnect', (_e, tenantId: string) => disconnectTenant(tenantId))

  // Resolve the org display name (used to label a freshly-added tenant).
  ipcMain.handle('tenant:displayName', async (_e, tenantId: string) => {
    if (mode.demo) return 'Contoso Academy'
    try {
      const resp = await graphGet(tenantId, '/v1.0/organization?$select=displayName')
      const name = resp?.value?.[0]?.displayName ?? ''
      if (name) updateTenantDisplayName(tenantId, name)
      return name
    } catch {
      return ''
    }
  })

  // ── Shared enabled-users loader (used by most tools) ─────────────────────────
  ipcMain.handle('users:listEnabled', async (_e, tenantId: string) => {
    if (mode.demo)
      return demoUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName
      }))
    return graphPaged(
      tenantId,
      "/v1.0/users?$select=id,displayName,userPrincipalName&$top=999&$filter=accountEnabled eq true"
    )
  })

  // ── Tools ────────────────────────────────────────────────────────────────────
  registerUserPasswordResetTool()
  registerYearGroupTool()
  registerBulkUpnTool()
  registerImmutableIdTool()
  registerLastDeviceTool()
  registerSignInLogsTool()
  registerGroupCopyTool()
  registerTeamsTool()
}
