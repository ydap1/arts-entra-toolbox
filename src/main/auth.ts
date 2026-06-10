// Auth — port of Start-TenantConnectAsync, but linear (no runspace/timer needed).
// Silent-first (using the saved account hint as loginHint), interactive fallback
// via the system browser + loopback redirect.

import { shell } from 'electron'
import {
  PublicClientApplication,
  LogLevel,
  type Configuration,
  type InteractiveRequest,
  type SilentFlowRequest,
  type AuthenticationResult
} from '@azure/msal-node'
import { makeCachePlugin, encryptionAvailable, deleteCache } from './tokenCache'
import { setAccessToken, clearAccessToken } from './graph'
import { getAccountHint, setAccountHint } from './config'

// Well-known Microsoft Intune PowerShell public client — no app registration needed.
const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'

const SCOPES = [
  'https://graph.microsoft.com/User.ReadWrite.All',
  'https://graph.microsoft.com/DeviceManagementManagedDevices.Read.All',
  'https://graph.microsoft.com/AuditLog.Read.All',
  'https://graph.microsoft.com/GroupMember.ReadWrite.All',
  'https://graph.microsoft.com/Team.Create',
  'https://graph.microsoft.com/TeamMember.ReadWrite.All',
  'https://graph.microsoft.com/Directory.Read.All',
  'https://graph.microsoft.com/MailboxSettings.ReadWrite',
  'https://graph.microsoft.com/SecurityEvents.Read.All'
]

export type ConnectResult = {
  account: string
  tenantId: string
  cachePersisted: boolean
  mode: 'silent' | 'interactive'
}

// One app per tenant — keeps the in-memory cache alive across reconnects in a session.
const apps = new Map<string, PublicClientApplication>()

function getApp(tenantId: string): PublicClientApplication {
  let app = apps.get(tenantId)
  if (app) return app

  const config: Configuration = {
    auth: {
      clientId: CLIENT_ID,
      authority: `https://login.microsoftonline.com/${tenantId}`
    },
    cache: { cachePlugin: makeCachePlugin(tenantId) },
    system: {
      loggerOptions: {
        loggerCallback: (level, message) => {
          if (level <= LogLevel.Warning) console.log(`[msal] ${message}`)
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false
      }
    }
  }
  app = new PublicClientApplication(config)
  apps.set(tenantId, app)
  return app
}

export async function connectTenant(tenantId: string): Promise<ConnectResult> {
  const app = getApp(tenantId)
  const hint = getAccountHint(tenantId)

  // Step 1: silent (uses persisted/in-memory cache).
  let result: AuthenticationResult | null = null
  let mode: 'silent' | 'interactive' = 'silent'
  try {
    const accounts = await app.getTokenCache().getAllAccounts()
    const account =
      (hint && accounts.find((a) => a.username?.toLowerCase() === hint.toLowerCase())) ||
      accounts.find((a) => a.tenantId === tenantId) ||
      accounts[0]
    if (account) {
      const req: SilentFlowRequest = { scopes: SCOPES, account }
      result = await app.acquireTokenSilent(req)
    }
  } catch {
    result = null
  }

  // Step 2: interactive fallback — opens the system browser, listens on loopback.
  if (!result) {
    mode = 'interactive'
    const req: InteractiveRequest = {
      scopes: SCOPES,
      openBrowser: async (url: string) => {
        await shell.openExternal(url)
      },
      successTemplate:
        '<html><body style="font-family:Segoe UI;background:#0F1115;color:#E6E9EF;padding:40px"><h2>Signed in.</h2><p>You can close this window and return to the toolbox.</p></body></html>',
      errorTemplate:
        '<html><body style="font-family:Segoe UI;background:#0F1115;color:#EF4444;padding:40px"><h2>Sign-in failed.</h2></body></html>'
    }
    result = await app.acquireTokenInteractive(req)
  }

  if (!result?.accessToken) throw new Error('Token acquisition returned null.')

  setAccessToken(tenantId, result.accessToken)
  const account = result.account?.username ?? ''
  if (account) setAccountHint(tenantId, account)

  return {
    account,
    tenantId,
    cachePersisted: encryptionAvailable(),
    mode
  }
}

// ── Exchange Online token (EWS) ───────────────────────────────────────────────
// Separate resource from Graph — must be acquired independently.
// The Intune PS client has pre-consented Exchange Online access, so this is
// usually silent after the first interactive consent.
const EWS_SCOPE = 'https://outlook.office365.com/EWS.AccessAsUser.All'

export async function getExchangeToken(tenantId: string): Promise<string> {
  const app = getApp(tenantId)
  const hint = getAccountHint(tenantId)
  const accounts = await app.getTokenCache().getAllAccounts()
  const account =
    (hint && accounts.find((a) => a.username?.toLowerCase() === hint.toLowerCase())) ||
    accounts.find((a) => a.tenantId === tenantId) ||
    accounts[0]

  if (!account) throw new Error('Not connected — connect the tenant first.')

  // Silent first (MSAL caches EWS tokens separately from Graph tokens).
  try {
    const result = await app.acquireTokenSilent({ scopes: [EWS_SCOPE], account })
    if (result?.accessToken) return result.accessToken
  } catch {
    /* fall through */
  }

  // Interactive fallback — opens system browser for Exchange Online consent.
  const result = await app.acquireTokenInteractive({
    scopes: [EWS_SCOPE],
    loginHint: account.username,
    openBrowser: async (url: string) => { await shell.openExternal(url) },
    successTemplate:
      '<html><body style="font-family:Segoe UI;background:#0F1115;color:#E6E9EF;padding:40px"><h2>Exchange access granted.</h2><p>You can close this window and return to the toolbox.</p></body></html>',
    errorTemplate:
      '<html><body style="font-family:Segoe UI;background:#0F1115;color:#EF4444;padding:40px"><h2>Exchange authorisation failed.</h2></body></html>'
  })

  if (!result?.accessToken) throw new Error('Could not acquire Exchange Online token.')
  return result.accessToken
}

export function disconnectTenant(tenantId: string): void {
  clearAccessToken(tenantId)
  apps.delete(tenantId)
  deleteCache(tenantId)
  setAccountHint(tenantId, '')
}
