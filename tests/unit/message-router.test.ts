import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Runtime } from 'webextension-polyfill'

const { getSettings, listContext } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  listContext: vi.fn()
}))

vi.mock('../../src/background/connection-manager', () => ({
  addConnection: vi.fn(),
  getSettings,
  removeConnection: vi.fn(),
  setDefaultConnection: vi.fn(),
  updateConnection: vi.fn(),
  updateSettings: vi.fn()
}))
vi.mock('../../src/background/context-manager', () => ({
  clearContext: vi.fn(),
  listContext,
  removeContext: vi.fn(),
  pinContext: vi.fn(),
  stageContext: vi.fn(),
  clearUnpinnedContext: vi.fn()
}))
vi.mock('../../src/background/permission-manager', () => ({
  getPermissionState: vi.fn(),
  removePermission: vi.fn(),
  requestPermission: vi.fn().mockResolvedValue(true)
}))
vi.mock('../../src/browser/platform', () => ({
  browser: {},
  capabilities: vi.fn().mockResolvedValue({})
}))

import { routeMessage } from '../../src/background/message-router'

const sender = (url?: string, frameId = 0) =>
  ({
    tab: url ? { id: 1, url } : undefined,
    frameId
  }) as Runtime.MessageSender

beforeEach(() => {
  vi.clearAllMocks()
  getSettings.mockResolvedValue({ connections: [], theme: 'system' })
})

describe('routeMessage', () => {
  it('returns a stable error for unknown messages', async () => {
    await expect(
      routeMessage({ type: 'not-supported' }, sender())
    ).resolves.toEqual({ error: 'Unsupported request.' })
  })

  it('rejects bridge requests from extension pages and frames', async () => {
    await expect(
      routeMessage({ type: 'context:list' }, sender())
    ).resolves.toEqual({
      error: 'Bridge requests require a WebUI page sender.'
    })
    await expect(
      routeMessage({ type: 'context:list' }, sender('https://webui.test', 1))
    ).resolves.toEqual({
      error: 'Bridge requests require a WebUI page sender.'
    })
  })

  it('allows bridge requests only from a configured top-level origin', async () => {
    getSettings.mockResolvedValue({
      connections: [
        {
          id: 'one',
          name: 'WebUI',
          url: 'https://webui.test/app',
          type: 'remote',
          createdAt: 1,
          updatedAt: 1
        }
      ],
      theme: 'system'
    })
    listContext.mockReturnValue(['context'])

    await expect(
      routeMessage({ type: 'context:list' }, sender('https://webui.test/chat'))
    ).resolves.toEqual(['context'])
    await expect(
      routeMessage({ type: 'context:list' }, sender('https://other.test/chat'))
    ).resolves.toEqual({
      error:
        'Bridge requests are only allowed from a configured Open WebUI origin.'
    })
  })

  it('does not expose unexpected exception details', async () => {
    listContext.mockImplementation(() => {
      throw new Error('database password: secret')
    })
    getSettings.mockResolvedValue({
      connections: [
        {
          id: 'one',
          name: 'WebUI',
          url: 'https://webui.test',
          type: 'remote',
          createdAt: 1,
          updatedAt: 1
        }
      ],
      theme: 'system'
    })

    await expect(
      routeMessage({ type: 'context:list' }, sender('https://webui.test'))
    ).resolves.toEqual({ error: 'Request failed.' })
  })
})
