import { ipcMain } from 'electron'
import { graphPaged, graphPatch } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'
import { demoUsers } from '../demo'

export type YgUser = {
  id: string
  displayName: string
  userPrincipalName: string
  department: string
}

export function registerYearGroupTool(): void {
  // Enabled users that have a department set (the "year group" anchor).
  ipcMain.handle('yg:users', async (_e, a: { tenantId: string }): Promise<YgUser[]> => {
    if (mode.demo)
      return demoUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName,
        department: u.department
      }))
    // accountEnabled filtered server-side to halve the payload on tenants with
    // many disabled accounts; department still filtered client-side (Graph OData
    // null-check support varies by tenant type).
    const items = await graphPaged(
      a.tenantId,
      '/v1.0/users?$select=id,displayName,userPrincipalName,department&$filter=accountEnabled eq true&$top=999'
    )
    return items
      .filter((u) => u.department)
      .map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName,
        department: u.department
      }))
  })

  // Reset one user's password (used per-row so the grid can update live).
  ipcMain.handle(
    'yg:resetOne',
    async (
      _e,
      a: { tenantId: string; id: string; name: string; upn: string; pw: string }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY RUN] ${a.name}  ->  ${a.pw}`, 'TextDim')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`OK: ${a.name}  (${a.upn})  [DEMO]`, 'Success')
        return { ok: true }
      }
      try {
        await graphPatch(a.tenantId, `/v1.0/users/${a.id}`, {
          passwordProfile: { password: a.pw, forceChangePasswordNextSignIn: false }
        })
        appLog(`OK: ${a.name}  (${a.upn})`, 'Success')
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`FAILED: ${a.name} — ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )
}
