import { ipcMain } from 'electron'
import { graphGet } from '../graph'
import { mode } from '../mode'
import { demoSignIns } from '../demo'

export type SignInRow = {
  dateTime: string
  application: string
  result: string
  failed: boolean
  ipAddress: string
  location: string
  device: string
}

export function registerSignInLogsTool(): void {
  // Last 50 sign-ins for one user. Requires AuditLog.Read.All.
  ipcMain.handle(
    'sl:logs',
    async (_e, a: { tenantId: string; userId: string }): Promise<SignInRow[]> => {
      if (mode.demo) return demoSignIns(a.userId) as SignInRow[]

      const path =
        '/v1.0/auditLogs/signIns' +
        `?$filter=userId eq '${a.userId}'` +
        '&$top=50&$orderby=createdDateTime desc' +
        '&$select=createdDateTime,appDisplayName,status,ipAddress,location,deviceDetail'
      const resp = await graphGet(a.tenantId, path)
      const logs = resp?.value ?? []
      return logs.map((e: any): SignInRow => {
        const ok = e.status?.errorCode === 0
        const loc = [e.location?.city, e.location?.countryOrRegion].filter(Boolean).join(', ')
        return {
          dateTime: e.createdDateTime
            ? new Date(e.createdDateTime).toISOString().slice(0, 16).replace('T', ' ')
            : '',
          application: e.appDisplayName ?? '',
          result: ok ? 'Success' : `Failure (${e.status?.errorCode})`,
          failed: !ok,
          ipAddress: e.ipAddress ?? '',
          location: loc,
          device: e.deviceDetail?.displayName ?? ''
        }
      })
    }
  )
}
