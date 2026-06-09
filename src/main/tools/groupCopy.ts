import { ipcMain } from 'electron'
import { graphPaged, graphPost } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'
import { demoGroupsForUser } from '../demo'

export type GcGroup = { id: string; displayName: string }

// A user's direct group memberships (security / M365 groups only).
async function memberGroups(tenantId: string, userId: string): Promise<any[]> {
  const items = await graphPaged(
    tenantId,
    `/v1.0/users/${userId}/memberOf?$select=id,displayName&$top=999`
  )
  return items.filter((g) => g['@odata.type'] === '#microsoft.graph.group')
}

export function registerGroupCopyTool(): void {
  ipcMain.handle('gc:groups', async (_e, a: { tenantId: string; userId: string }): Promise<GcGroup[]> => {
    if (mode.demo)
      return demoGroupsForUser(a.userId)
        .filter((g) => g.type === 'Group')
        .map((g) => ({ id: g.id, displayName: g.displayName }))
    const groups = await memberGroups(a.tenantId, a.userId)
    return groups
      .map((g) => ({ id: g.id, displayName: g.displayName }))
      .sort((x, y) => x.displayName.localeCompare(y.displayName))
  })

  // Group IDs the target already belongs to — used to skip duplicates.
  ipcMain.handle('gc:memberIds', async (_e, a: { tenantId: string; userId: string }): Promise<string[]> => {
    if (mode.demo) return demoGroupsForUser(a.userId).map((g) => g.id)
    const groups = await memberGroups(a.tenantId, a.userId)
    return groups.map((g) => g.id)
  })

  ipcMain.handle(
    'gc:addOne',
    async (
      _e,
      a: { tenantId: string; groupId: string; targetId: string; name: string }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would add to group: ${a.name}`, 'Warning')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`[DEMO] Added to group: ${a.name}`, 'TextDim')
        return { ok: true }
      }
      try {
        await graphPost(a.tenantId, `/v1.0/groups/${a.groupId}/members/$ref`, {
          '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${a.targetId}`
        })
        appLog(`Added: ${a.name}`, 'Success')
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`Failed: ${a.name} — ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )
}
