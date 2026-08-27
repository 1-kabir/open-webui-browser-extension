import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => ({
  value: {
    connections: [
      {
        id: 'one',
        name: 'Primary',
        url: 'https://primary.example/app',
        type: 'remote',
        createdAt: 10,
        updatedAt: 10
      },
      {
        id: 'two',
        name: 'Secondary',
        url: 'http://localhost:8080',
        type: 'local',
        createdAt: 11,
        updatedAt: 11
      }
    ],
    defaultConnectionId: 'one',
    theme: 'system'
  }
}))

vi.mock('../../src/browser/platform', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async () => ({
          'open-webui-settings': structuredClone(storage.value)
        })),
        set: vi.fn(async (value) => {
          storage.value = structuredClone(value['open-webui-settings'])
        })
      }
    }
  }
}))

import {
  updateConnection,
  validateConnectionReachability
} from '../../src/background/connection-manager'

describe('connection manager editing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    storage.value.defaultConnectionId = 'one'
    storage.value.connections[0]!.updatedAt = 10
  })

  it('edits fields while preserving id, creation time, and default connection', async () => {
    const settings = await updateConnection('one', {
      name: 'Renamed',
      url: 'https://new.example/webui'
    })
    const connection = settings.connections.find(({ id }) => id === 'one')!
    expect(connection).toMatchObject({
      id: 'one',
      name: 'Renamed',
      url: 'https://new.example/webui',
      createdAt: 10
    })
    expect(settings.defaultConnectionId).toBe('one')
    expect(connection.updatedAt).toBeGreaterThan(10)
  })

  it.each([
    [{ name: '', url: 'https://valid.example' }],
    [{ name: 'Valid', url: 'javascript:alert(1)' }],
    [{ name: 'Valid', url: 'https://user:pass@valid.example' }]
  ])('rejects malformed updates: %j', async (input) => {
    await expect(updateConnection('one', input)).rejects.toThrow()
  })
})

describe('bounded connection reachability', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('checks without credentials or context and accepts an ordinary response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      validateConnectionReachability('https://webui.example/app')
    ).resolves.toEqual({
      ok: true,
      status: 204
    })
    expect(fetchMock).toHaveBeenCalledWith('https://webui.example/app', {
      method: 'HEAD',
      redirect: 'manual',
      credentials: 'omit',
      body: undefined,
      signal: expect.any(AbortSignal)
    })
  })

  it('reports redirects as unreachable without following them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 302 }))
    )
    await expect(
      validateConnectionReachability('https://webui.example')
    ).resolves.toEqual({
      ok: false,
      status: 302,
      error: 'The connection returned an HTTP 302 response.'
    })
  })

  it('aborts a pending request after exactly five seconds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const resultPromise = validateConnectionReachability(
      'https://webui.example'
    )
    await vi.advanceTimersByTimeAsync(0)
    const request = fetchMock.mock.calls[0]?.[1]
    expect(request?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(4_999)
    expect(request?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      error: 'The connection test timed out.'
    })
    expect(request?.signal?.aborted).toBe(true)
  })

  it('reports network failure without exposing details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('secret host detail'))
    )
    await expect(
      validateConnectionReachability('https://webui.example')
    ).resolves.toEqual({
      ok: false,
      error: 'The connection could not be reached.'
    })
  })
})
