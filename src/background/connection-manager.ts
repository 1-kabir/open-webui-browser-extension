import { browser } from '../browser/platform'
import type { Connection, Settings } from '../shared/types'
import type { ConnectionInput } from '../shared/validation'
import {
  normalizeConnectionUrl,
  normalizeSettings,
  validateConnectionInput
} from '../shared/validation'

const KEY = 'open-webui-settings'
export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(KEY)
  const settings = normalizeSettings(result[KEY])
  if (JSON.stringify(settings) !== JSON.stringify(result[KEY]))
    await browser.storage.local.set({ [KEY]: settings })
  return settings
}

async function save(settings: Settings): Promise<Settings> {
  const normalized = normalizeSettings(settings)
  await browser.storage.local.set({ [KEY]: normalized })
  return normalized
}

export async function addConnection(input: unknown): Promise<Connection> {
  const validated = validateConnectionInput(input)
  const settings = await getSettings()
  const now = Date.now()
  const connection: Connection = {
    ...validated,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  }
  settings.connections = [...settings.connections, connection]
  settings.defaultConnectionId ??= connection.id
  return (await save(settings)).connections.find(
    ({ id }) => id === connection.id
  )!
}

export async function updateConnection(
  id: string,
  input: ConnectionInput
): Promise<Settings> {
  const validated = validateConnectionInput(input)
  const settings = await getSettings()
  const index = settings.connections.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('Connection not found.')
  settings.connections[index] = {
    ...settings.connections[index],
    ...validated,
    updatedAt: Date.now()
  }
  return save(settings)
}

export async function validateConnectionReachability(
  url: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const target = normalizeConnectionUrl(url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    const response = await fetch(target, {
      method: 'HEAD',
      redirect: 'manual',
      credentials: 'omit',
      body: undefined,
      signal: controller.signal
    })
    if (response.status >= 300 && response.status < 400)
      return {
        ok: false,
        status: response.status,
        error: `The connection returned an HTTP ${response.status} response.`
      }
    return { ok: response.ok, status: response.status }
  } catch (cause) {
    return {
      ok: false,
      error:
        cause instanceof DOMException && cause.name === 'AbortError'
          ? 'The connection test timed out.'
          : 'The connection could not be reached.'
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function removeConnection(id: string): Promise<Settings> {
  const settings = await getSettings()
  settings.connections = settings.connections.filter((item) => item.id !== id)
  if (settings.defaultConnectionId === id)
    settings.defaultConnectionId = settings.connections[0]?.id ?? null
  return save(settings)
}

export async function setDefaultConnection(id: string): Promise<Settings> {
  const settings = await getSettings()
  if (!settings.connections.some((item) => item.id === id))
    throw new Error('Connection not found.')
  settings.defaultConnectionId = id
  return save(settings)
}

export async function updateSettings(patch: unknown): Promise<Settings> {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch))
    throw new Error('Invalid settings.')
  const current = await getSettings()
  const candidate = patch as Record<string, unknown>
  if (
    candidate.theme !== undefined &&
    !['system', 'light', 'dark'].includes(String(candidate.theme))
  )
    throw new Error('Invalid theme.')
  return save({
    ...current,
    theme: (candidate.theme as Settings['theme']) ?? current.theme
  })
}
