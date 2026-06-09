import { ipcMain } from 'electron'
import { graphPaged, graphPatch } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'

export type IidUser = {
  id: string
  displayName: string
  userPrincipalName: string
  onPremisesImmutableId: string | null
}

const demoIidUsers: IidUser[] = [
  { id: 'u1', displayName: 'Alice Johnson', userPrincipalName: 'alice@contoso.academy', onPremisesImmutableId: null },
  { id: 'u2', displayName: 'Bob Smith', userPrincipalName: 'bob@contoso.academy', onPremisesImmutableId: null },
  { id: 'u3', displayName: 'Carol White', userPrincipalName: 'carol@contoso.academy', onPremisesImmutableId: 'abc123==' },
  { id: 'u4', displayName: 'Dave Brown', userPrincipalName: 'dave@contoso.academy', onPremisesImmutableId: null },
  { id: 'u5', displayName: 'Emma Davis', userPrincipalName: 'emma@contoso.academy', onPremisesImmutableId: 'xyz987==' }
]

export function registerImmutableIdTool(): void {
  // Cloud-only member accounts and their current immutable IDs.
  ipcMain.handle('iid:load', async (_e, a: { tenantId: string }): Promise<IidUser[]> => {
    if (mode.demo) return demoIidUsers.map((u) => ({ ...u }))
    const items = await graphPaged(
      a.tenantId,
      "/v1.0/users?$select=id,displayName,userPrincipalName,onPremisesImmutableId,onPremisesSyncEnabled&$top=999&$filter=userType eq 'Member'"
    )
    return items
      .filter((u) => !u.onPremisesSyncEnabled)
      .map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName,
        onPremisesImmutableId: u.onPremisesImmutableId ?? null
      }))
  })

  ipcMain.handle(
    'iid:assignOne',
    async (
      _e,
      a: { tenantId: string; id: string; name: string; newId: string }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would assign ImmutableId: ${a.name} → ${a.newId}`, 'Warning')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`[DEMO] Assigned ImmutableId: ${a.name} → ${a.newId}`, 'TextDim')
        return { ok: true }
      }
      try {
        await graphPatch(a.tenantId, `/v1.0/users/${a.id}`, { onPremisesImmutableId: a.newId })
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`  Error on ${a.name}: ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )

  ipcMain.handle(
    'iid:removeOne',
    async (
      _e,
      a: { tenantId: string; id: string; name: string }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would remove ImmutableId from ${a.name}`, 'Warning')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`[DEMO] Removed ImmutableId from ${a.name}`, 'TextDim')
        return { ok: true }
      }
      try {
        await graphPatch(a.tenantId, `/v1.0/users/${a.id}`, { onPremisesImmutableId: null })
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`  Error on ${a.name}: ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )
}
