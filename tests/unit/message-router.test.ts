import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Runtime } from 'webextension-polyfill'

const { getSettings, listContext, validateConnectionReachability } = vi.hoisted(
  () => ({
    getSettings: vi.fn(),
    listContext: vi.fn(),
    validateConnectionReachability: vi.fn()
  })
)

vi.mock('../../src/background/connection-manager', () => ({
  addConnection: vi.fn(),
  getSettings,
  removeConnection: vi.fn(),
  setDefaultConnection: vi.fn(),
  updateConnection: vi.fn(),
  updateSettings: vi.fn(),
  validateConnectionReachability
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

const settings = {
  connections: [
    {
      id: 'one',
      name: 'WebUI',
      url: 'https://stored.example/app',
      type: 'remote',
      createdAt: 1,
      updatedAt: 1
    }
  ],
  defaultConnectionId: 'one',
  theme: 'system'
}

beforeEach(() => {
  vi.clearAllMocks()
  getSettings.mockResolvedValue({ connections: [], theme: 'system' })
  validateConnectionReachability.mockResolvedValue({ ok: true, status: 204 })
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
    getSettings.mockResolvedValue(settings)
    listContext.mockReturnValue(['context'])

    await expect(
      routeMessage(
        { type: 'context:list' },
        sender('https://stored.example/chat')
      )
    ).resolves.toEqual(['context'])
    await expect(
      routeMessage({ type: 'context:list' }, sender('https://other.test/chat'))
    ).resolves.toEqual({
      error:
        'Bridge requests are only allowed from a configured Open WebUI origin.'
    })
  })

  it('tests a valid stored connection by ID, never a caller URL', async () => {
    getSettings.mockResolvedValue(settings)

    await expect(
      routeMessage(
        { type: 'connection:test', id: 'one', url: 'https://attacker.example' },
        sender()
      )
    ).resolves.toEqual({ ok: true, status: 204 })
    expect(validateConnectionReachability).toHaveBeenCalledWith(
      'https://stored.example/app'
    )
  })

  it.each([
    ['missing', { type: 'connection:test' }],
    ['invalid', { type: 'connection:test', id: '' }],
    ['unknown', { type: 'connection:test', id: 'absent' }]
  ])('rejects %s connection test IDs safely', async (_label, message) => {
    getSettings.mockResolvedValue(settings)
    await expect(routeMessage(message, sender())).resolves.toEqual({
      error:
        _label === 'unknown'
          ? 'Connection not found.'
          : 'Invalid connection ID.'
    })
    expect(validateConnectionReachability).not.toHaveBeenCalled()
  })

  it('does not expose unexpected exception details from connection tests', async () => {
    getSettings.mockResolvedValue(settings)
    validateConnectionReachability.mockRejectedValue(
      new Error('database password: secret')
    )
    await expect(
      routeMessage({ type: 'connection:test', id: 'one' }, sender())
    ).resolves.toEqual({ error: 'Request failed.' })
  })

  it.each([
    ['missing', {}],
    ['null', { url: null }],
    ['object', { url: { value: 'https://webui.test' } }],
    ['array', { url: ['https://webui.test'] }]
  ])('rejects %s connection validation URLs', async (_label, input) => {
    await expect(
      routeMessage({ type: 'connection:validate', ...input }, sender())
    ).resolves.toEqual({ error: 'Connection URL is required.' })
  })

  it('does not expose unexpected exception details', async () => {
    listContext.mockImplementation(() => {
      throw new Error('database password: secret')
    })
    getSettings.mockResolvedValue(settings)

    await expect(
      routeMessage({ type: 'context:list' }, sender('https://stored.example'))
    ).resolves.toEqual({ error: 'Request failed.' })
  })
})
