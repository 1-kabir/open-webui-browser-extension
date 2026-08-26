import { browser } from '../browser/platform'
import type { Connection, Settings } from '../shared/types'
import { normalizeConnectionUrl } from '../shared/validation'
const KEY = 'open-webui-settings'
const defaults: Settings = {
  connections: [],
  defaultConnectionId: null,
  theme: 'system'
}
export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(KEY)
  return { ...defaults, ...(result[KEY] as Partial<Settings> | undefined) }
}
async function save(settings: Settings) {
  await browser.storage.local.set({ [KEY]: settings })
  return settings
}
export async function addConnection(
  input: Pick<Connection, 'name' | 'url' | 'type'>
): Promise<Connection> {
  const settings = await getSettings()
  const now = Date.now()
  const connection = {
    ...input,
    url: normalizeConnectionUrl(input.url),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  }
  settings.connections = [...settings.connections, connection]
  settings.defaultConnectionId ??= connection.id
  await save(settings)
  return connection
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
