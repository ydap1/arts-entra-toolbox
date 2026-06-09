import { ipcMain } from 'electron'
import { graphGet, graphPaged, graphPatch } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'
import { demoGroupsForUser } from '../demo'

export function registerUserPasswordResetTool(): void {
  // Current forceChangePasswordNextSignIn state.
  ipcMain.handle('upr:profile', async (_e, a: { tenantId: string; id: string }) => {
    if (mode.demo) return { force: false }
    const resp = await graphGet(a.tenantId, `/v1.0/users/${a.id}?$select=passwordProfile`)
    return { force: !!resp?.passwordProfile?.forceChangePasswordNextSignIn }
  })

  // Transitive group memberships for the selected user.
  ipcMain.handle('upr:groups', async (_e, a: { tenantId: string; id: string }) => {
    if (mode.demo)
      return demoGroupsForUser(a.id).map((g) => ({ displayName: g.displayName, type: g.type }))
    const items = await graphPaged(
      a.tenantId,
      `/v1.0/users/${a.id}/transitiveMemberOf?$select=displayName,groupTypes&$top=999`
    )
    return items.map((g) => ({
      displayName: g.displayName ?? '(unnamed)',
      type:
        g['@odata.type'] === '#microsoft.graph.directoryRole'
          ? 'Directory Role'
          : 'Group'
    }))
  })

  // The mutating reset.
  ipcMain.handle(
    'upr:reset',
    async (
      _e,
      a: { tenantId: string; id: string; upn: string; name: string; pw: string; force: boolean }
    ) => {
      const forceLabel = a.force ? 'will prompt on next sign-in' : 'no prompt required'
      if (mode.dry) {
        appLog(`[DRY] Would reset password for ${a.name} (${forceLabel})`, 'Warning')
        return { dry: true, force: a.force }
      }
      if (mode.demo) {
        appLog(`[DEMO] Reset password for ${a.name} (${forceLabel})`, 'Warning')
        return { ok: true, force: a.force }
      }
      await graphPatch(a.tenantId, `/v1.0/users/${a.id}`, {
        passwordProfile: { password: a.pw, forceChangePasswordNextSignIn: a.force }
      })
      appLog(`OK: ${a.name} (${a.upn}) — ${forceLabel}`, 'Success')
      return { ok: true, force: a.force }
    }
  )
}
