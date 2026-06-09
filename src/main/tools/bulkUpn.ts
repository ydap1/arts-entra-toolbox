import { ipcMain } from 'electron'
import { graphPaged, graphGet, graphPatch } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'

export type BucUser = {
  id: string
  displayName: string
  userPrincipalName: string
  department: string
  officeLocation: string
}

const demoBucUsers: BucUser[] = [
  { id: 'd1', displayName: 'Alice Smith', userPrincipalName: 'alice@contoso.edu', department: 'Year 10', officeLocation: 'Main Building' },
  { id: 'd2', displayName: 'Bob Jones', userPrincipalName: 'bob@contoso.edu', department: 'Year 10', officeLocation: 'Main Building' },
  { id: 'd3', displayName: 'Carol White', userPrincipalName: 'carol@contoso.edu', department: 'Year 11', officeLocation: 'Sixth Form Centre' },
  { id: 'd4', displayName: 'Dave Black', userPrincipalName: 'dave@contoso.edu', department: 'Year 11', officeLocation: 'Sixth Form Centre' },
  { id: 'd5', displayName: 'Eve Green', userPrincipalName: 'eve@contoso.edu', department: 'Staff', officeLocation: 'Admin Block' },
  { id: 'd6', displayName: 'Frank Hall', userPrincipalName: 'frank@contoso.edu', department: 'Staff', officeLocation: 'Admin Block' }
]
const demoBucDomains = ['contoso.edu', 'contoso.ac.uk', 'students.contoso.edu']

export function registerBulkUpnTool(): void {
  // Cloud-only enabled users (onPrem-synced excluded) + verified domains.
  ipcMain.handle(
    'buc:load',
    async (_e, a: { tenantId: string }): Promise<{ users: BucUser[]; domains: string[] }> => {
      if (mode.demo) return { users: demoBucUsers, domains: demoBucDomains }

      const items = await graphPaged(
        a.tenantId,
        '/v1.0/users?$select=id,displayName,userPrincipalName,onPremisesSyncEnabled,department,officeLocation&$top=999&$filter=accountEnabled eq true'
      )
      const users: BucUser[] = items
        .filter((u) => !u.onPremisesSyncEnabled)
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          userPrincipalName: u.userPrincipalName,
          department: u.department ?? '',
          officeLocation: u.officeLocation ?? ''
        }))
        .sort((x, y) => x.displayName.localeCompare(y.displayName))

      const dResp = await graphGet(a.tenantId, '/v1.0/domains?$select=id,isVerified')
      const domains: string[] = (dResp?.value ?? [])
        .filter((d: { isVerified: boolean }) => d.isVerified)
        .map((d: { id: string }) => d.id)
        .sort()

      return { users, domains }
    }
  )

  // Apply one UPN change (per-row so the grid updates live).
  ipcMain.handle(
    'buc:applyOne',
    async (
      _e,
      a: { tenantId: string; id: string; oldUpn: string; newUpn: string }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would change UPN domain: ${a.oldUpn} → ${a.newUpn}`, 'Warning')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`Demo changed: ${a.oldUpn}  →  ${a.newUpn}`, 'Success')
        return { ok: true }
      }
      try {
        await graphPatch(a.tenantId, `/v1.0/users/${a.id}`, { userPrincipalName: a.newUpn })
        appLog(`Changed: ${a.oldUpn}  →  ${a.newUpn}`, 'Success')
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`Failed:  ${a.oldUpn} — ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )
}
