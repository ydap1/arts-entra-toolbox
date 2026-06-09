// MSAL token-cache persistence using Electron safeStorage (DPAPI on Windows).
// Replaces the hand-compiled EtbTokenCacheHelper C# from Auth.ps1.

import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node'

function cacheFile(tenantId: string): string {
  const dir = join(app.getPath('userData'), 'msal_cache')
  return join(dir, `${tenantId.replace(/[^a-zA-Z0-9]/g, '')}.bin`)
}

export function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function deleteCache(tenantId: string): void {
  try {
    rmSync(cacheFile(tenantId), { force: true })
  } catch {
    // best-effort
  }
}

export function makeCachePlugin(tenantId: string): ICachePlugin {
  const file = cacheFile(tenantId)
  return {
    beforeCacheAccess: async (ctx: TokenCacheContext) => {
      try {
        if (!existsSync(file)) return
        const buf = readFileSync(file)
        const plain = encryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8')
        ctx.tokenCache.deserialize(plain)
      } catch {
        // Corrupt/undecryptable cache: ignore and fall through to interactive auth.
      }
    },
    afterCacheAccess: async (ctx: TokenCacheContext) => {
      if (!ctx.cacheHasChanged) return
      try {
        mkdirSync(dirname(file), { recursive: true })
        const plain = ctx.tokenCache.serialize()
        const buf = encryptionAvailable()
          ? safeStorage.encryptString(plain)
          : Buffer.from(plain, 'utf8')
        writeFileSync(file, buf)
      } catch {
        // Best-effort persistence; silent failure mirrors the PS behaviour.
      }
    }
  }
}
