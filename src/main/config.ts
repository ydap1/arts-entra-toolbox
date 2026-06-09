// Tenant profiles + app settings — mirror of the tenants.json / settings.json
// store in Auth.ps1. Persisted under Electron userData (not the app bundle).

import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type Tenant = {
  tenantId: string
  displayName: string
  accountHint?: string
}

function configDir(): string {
  const dir = join(app.getPath('userData'), 'config')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function tenantsPath(): string {
  return join(configDir(), 'tenants.json')
}

function settingsPath(): string {
  return join(configDir(), 'settings.json')
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback
    const raw = readFileSync(path, 'utf8')
    if (!raw.trim()) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

export function getSavedTenants(): Tenant[] {
  return readJson<Tenant[]>(tenantsPath(), [])
}

export function saveTenant(tenantId: string, displayName = ''): void {
  const all = getSavedTenants()
  const existing = all.find((t) => t.tenantId === tenantId)
  if (existing) {
    // Update the name if the caller supplied one (e.g. re-add with a different label).
    if (displayName) existing.displayName = displayName
  } else {
    all.push({ tenantId, displayName })
  }
  writeJson(tenantsPath(), all)
}

export function updateTenantDisplayName(tenantId: string, displayName: string): void {
  const all = getSavedTenants()
  const t = all.find((x) => x.tenantId === tenantId)
  if (t) {
    t.displayName = displayName
    writeJson(tenantsPath(), all)
  }
}

export function removeSavedTenant(tenantId: string): void {
  writeJson(
    tenantsPath(),
    getSavedTenants().filter((t) => t.tenantId !== tenantId)
  )
}

export function getAccountHint(tenantId: string): string | undefined {
  return getSavedTenants().find((t) => t.tenantId === tenantId)?.accountHint || undefined
}

export function setAccountHint(tenantId: string, accountHint: string): void {
  const all = getSavedTenants()
  const t = all.find((x) => x.tenantId === tenantId)
  if (t) {
    t.accountHint = accountHint
    writeJson(tenantsPath(), all)
  }
}

export function getSetting<T = unknown>(name: string): T | null {
  const s = readJson<Record<string, unknown>>(settingsPath(), {})
  return name in s ? (s[name] as T) : null
}

export function setSetting(name: string, value: unknown): void {
  const s = readJson<Record<string, unknown>>(settingsPath(), {})
  s[name] = value
  writeJson(settingsPath(), s)
}
