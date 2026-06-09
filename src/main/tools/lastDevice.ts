import { ipcMain } from 'electron'
import { graphPaged } from '../graph'
import { mode } from '../mode'
import { demoUsers, demoDevices } from '../demo'

export type LdUser = { id: string; displayName: string; userPrincipalName: string }
export type LdLogon = { userId: string; lastLogOnDateTime: string | null }
export type LdDevice = {
  id: string
  deviceName: string
  lastSyncDateTime: string | null
  usersLoggedOn: LdLogon[]
}

export function registerLastDeviceTool(): void {
  ipcMain.handle('ld:users', async (_e, a: { tenantId: string }): Promise<LdUser[]> => {
    if (mode.demo)
      return demoUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName
      }))
    const items = await graphPaged(
      a.tenantId,
      '/v1.0/users?$select=id,displayName,userPrincipalName&$filter=accountEnabled eq true&$top=999'
    )
    return items.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      userPrincipalName: u.userPrincipalName
    }))
  })

  // All Intune-managed devices. Intune OData can't filter usersLoggedOn, so the
  // renderer matches users to devices client-side.
  ipcMain.handle('ld:devices', async (_e, a: { tenantId: string }): Promise<LdDevice[]> => {
    if (mode.demo) return demoDevices.map((d) => ({ ...d }))
    const items = await graphPaged(
      a.tenantId,
      '/beta/deviceManagement/managedDevices?$select=id,deviceName,usersLoggedOn,lastSyncDateTime&$top=999'
    )
    return items.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      lastSyncDateTime: d.lastSyncDateTime ?? null,
      usersLoggedOn: (d.usersLoggedOn ?? []).map((l: LdLogon) => ({
        userId: l.userId,
        lastLogOnDateTime: l.lastLogOnDateTime ?? null
      }))
    }))
  })
}
