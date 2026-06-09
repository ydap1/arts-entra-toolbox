import { ipcMain } from 'electron'
import { graphGet, graphPaged, graphPost, graphPostLocation } from '../graph'
import { mode } from '../mode'
import { appLog } from '../log'
import { demoUsers } from '../demo'

export type TpUser = {
  id: string
  displayName: string
  userPrincipalName: string
  department: string
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Normalise the 202 Location header to an absolute operation URL we can poll.
function operationUrl(location: string): string {
  if (/^https?:\/\//.test(location)) return location
  const path = /^\/v\d/.test(location) ? location : `/v1.0${location}`
  return `https://graph.microsoft.com${path}`
}

export function registerTeamsTool(): void {
  // Enabled users with department — drives the year-group combo and direct search.
  ipcMain.handle('team:users', async (_e, a: { tenantId: string }): Promise<TpUser[]> => {
    if (mode.demo)
      return demoUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName,
        department: u.department
      }))
    return graphPaged(
      a.tenantId,
      '/v1.0/users?$select=id,displayName,userPrincipalName,department&$filter=accountEnabled eq true&$top=999'
    )
  })

  // Create the team (with the connecting admin as the seed owner) and wait for
  // provisioning to finish. Returns the new teamId so the renderer can add members.
  ipcMain.handle(
    'team:create',
    async (
      _e,
      a: { tenantId: string; teamName: string; template: string; adminUpn: string; memberCount: number }
    ): Promise<{ ok: boolean; teamId?: string; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would create team '${a.teamName}' with ${a.memberCount} member(s)`, 'Warning')
        return { ok: true, teamId: 'dry-run' }
      }
      if (mode.demo) {
        appLog(`[DEMO] Created team '${a.teamName}'`, 'TextDim')
        return { ok: true, teamId: 'demo-team' }
      }
      if (!a.adminUpn) {
        return { ok: false, err: 'Admin UPN unavailable — disconnect and reconnect to refresh.' }
      }
      try {
        const body = {
          'template@odata.bind': `https://graph.microsoft.com/v1.0/teamsTemplates('${a.template}')`,
          displayName: a.teamName,
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${a.adminUpn}')`
            }
          ]
        }
        const location = await graphPostLocation(a.tenantId, '/v1.0/teams', body)
        if (!location) throw new Error('No Location header in team-create response.')
        const opUrl = operationUrl(location)
        appLog(`Team provisioning started — polling for completion…`, 'TextDim')

        for (let polls = 1; polls <= 30; polls++) {
          await delay(3000)
          const op = await graphGet(a.tenantId, opUrl)
          if (op?.status === 'succeeded') {
            const teamId = op.targetResourceId as string
            appLog(`Team created. ID: ${teamId}`, 'Success')
            return { ok: true, teamId }
          }
          if (op?.status === 'failed') {
            throw new Error(`Provisioning failed: ${op.error?.message ?? 'unknown error'}`)
          }
          appLog(`Provisioning status: ${op?.status} (${polls}/30)`, 'TextDim')
        }
        throw new Error('Timed out waiting for team provisioning (90s). Check the Teams admin centre.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`Team creation failed: ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )

  // Add one member (or owner) to an existing team — called per-row for live progress.
  ipcMain.handle(
    'team:addMember',
    async (
      _e,
      a: { tenantId: string; teamId: string; upn: string; name: string; isOwner: boolean }
    ): Promise<{ ok: boolean; err?: string }> => {
      if (mode.dry) {
        appLog(`[DRY] Would add: ${a.name}${a.isOwner ? ' [Owner]' : ''}`, 'Warning')
        return { ok: true }
      }
      if (mode.demo) {
        appLog(`[DEMO] Added: ${a.name}${a.isOwner ? ' [Owner]' : ''}`, 'TextDim')
        return { ok: true }
      }
      try {
        await graphPost(a.tenantId, `/v1.0/teams/${a.teamId}/members`, {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: a.isOwner ? ['owner'] : [],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${a.upn}')`
        })
        appLog(`Added: ${a.name}${a.isOwner ? ' [Owner]' : ''}`, 'Success')
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appLog(`Failed: ${a.name} — ${msg}`, 'Danger')
        return { ok: false, err: msg }
      }
    }
  )
}
