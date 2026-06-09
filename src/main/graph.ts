// Graph REST helpers — mirror of Invoke-GraphGet / Invoke-GraphPatch / Get-GraphPaged.
// Access tokens live here, in the main process only; the renderer never sees them.

const BASE = 'https://graph.microsoft.com'
const tokens = new Map<string, string>()

export function setAccessToken(tenantId: string, token: string): void {
  tokens.set(tenantId, token)
}

export function clearAccessToken(tenantId: string): void {
  tokens.delete(tenantId)
}

export function hasToken(tenantId: string): boolean {
  return tokens.has(tenantId)
}

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function request(
  tenantId: string,
  method: string,
  pathOrUrl: string,
  body?: unknown
): Promise<any> {
  const token = tokens.get(tenantId)
  if (!token) throw new GraphError('not-connected', 0)

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) throw new GraphError('session-expired', 401)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new GraphError(`Graph ${method} ${pathOrUrl} -> ${res.status}: ${text}`, res.status)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') ?? ''
  return ct.includes('application/json') ? res.json() : null
}

export const graphGet = (tenantId: string, path: string): Promise<any> =>
  request(tenantId, 'GET', path)

export const graphPatch = (tenantId: string, path: string, body: unknown): Promise<any> =>
  request(tenantId, 'PATCH', path, body)

export const graphPost = (tenantId: string, path: string, body: unknown): Promise<any> =>
  request(tenantId, 'POST', path, body)

// POST that returns the response Location header — for async operations like team
// creation, where Graph replies 202 and the team is provisioned in the background.
export async function graphPostLocation(
  tenantId: string,
  path: string,
  body: unknown
): Promise<string | null> {
  const token = tokens.get(tenantId)
  if (!token) throw new GraphError('not-connected', 0)

  const url = path.startsWith('http') ? path : BASE + path
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (res.status === 401) throw new GraphError('session-expired', 401)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new GraphError(`Graph POST ${path} -> ${res.status}: ${text}`, res.status)
  }
  return res.headers.get('location')
}

export const graphDelete = (tenantId: string, path: string): Promise<any> =>
  request(tenantId, 'DELETE', path)

// Follows @odata.nextLink automatically (mirror of Get-GraphPaged).
export async function graphPaged(tenantId: string, path: string): Promise<any[]> {
  const items: any[] = []
  let next: string | null = path
  do {
    const resp = await request(tenantId, 'GET', next)
    if (Array.isArray(resp?.value)) items.push(...resp.value)
    next = resp?.['@odata.nextLink'] ?? null
  } while (next)
  return items
}
