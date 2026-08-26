import type { Connection, ConnectionType, Settings } from './types'

const connectionNameLimit = 100
const connectionTypes = new Set<ConnectionType>(['local', 'remote'])

export function normalizeConnectionUrl(value: string): string {
  if (typeof value !== 'string') throw new Error('Connection URL is required.')
  const raw = value.trim()
  if (!raw || raw.length > 2_048)
    throw new Error('Enter a valid connection URL.')
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error('Enter a valid connection URL.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error('Only HTTP and HTTPS connections are supported.')
  if (parsed.username || parsed.password)
    throw new Error('Connection URLs must not contain credentials.')
  if (!parsed.hostname || (parsed.port && !/^\d+$/.test(parsed.port)))
    throw new Error('Connection URL must include a valid host and port.')
  parsed.hash = ''
  parsed.search = parsed.search
  return parsed.toString().replace(/\/$/, '')
}

export function classifyConnection(url: string): ConnectionType {
  const hostname = new URL(url).hostname.toLowerCase()
  return hostname === 'localhost' ||
    hostname === '::1' ||
    /^127\./.test(hostname)
    ? 'local'
    : 'remote'
}

export function validateConnectionInput(input: unknown): {
  name: string
  url: string
  type: ConnectionType
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new Error('Invalid connection details.')
  const candidate = input as Record<string, unknown>
  if (typeof candidate.name !== 'string')
    throw new Error('Connection name is required.')
  const name = candidate.name.trim()
  if (!name || name.length > connectionNameLimit)
    throw new Error('Connection name must be 1–100 characters.')
  const url = normalizeConnectionUrl(candidate.url as string)
  const type = candidate.type
  if (
    type !== undefined &&
    (typeof type !== 'string' || !connectionTypes.has(type as ConnectionType))
  )
    throw new Error('Invalid connection type.')
  return {
    name,
    url,
    type: (type as ConnectionType) ?? classifyConnection(url)
  }
}

export function normalizeSettings(value: unknown): Settings {
  const source =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {}
  const rawConnections = Array.isArray(source.connections)
    ? source.connections
    : []
  const connections: Connection[] = []
  for (const raw of rawConnections) {
    if (typeof raw !== 'object' || raw === null) continue
    const item = raw as Record<string, unknown>
    if (
      typeof item.id !== 'string' ||
      !item.id ||
      typeof item.createdAt !== 'number'
    )
      continue
    try {
      const input = validateConnectionInput(item)
      connections.push({
        ...input,
        id: item.id,
        createdAt: item.createdAt,
        updatedAt:
          typeof item.updatedAt === 'number' ? item.updatedAt : item.createdAt
      })
    } catch {
      /* Discard malformed persisted records. */
    }
  }
  const requestedDefault =
    typeof source.defaultConnectionId === 'string'
      ? source.defaultConnectionId
      : null
  const theme =
    source.theme === 'light' || source.theme === 'dark'
      ? source.theme
      : 'system'
  return {
    connections,
    defaultConnectionId: connections.some(({ id }) => id === requestedDefault)
      ? requestedDefault
      : (connections[0]?.id ?? null),
    theme
  }
}

export function assertContextText(
  text: string,
  maxLength = 100_000
): { text: string; truncated: boolean } {
  return text.length <= maxLength
    ? { text, truncated: false }
    : { text: text.slice(0, maxLength), truncated: true }
}
