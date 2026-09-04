import { describe, expect, it, vi } from 'vitest'
import {
  BRIDGE_PROTOCOL,
  createBridgeMessage,
  isAllowedBridgeOrigin,
  isBridgeMessage,
  isBridgeMessageEvent,
  MAX_MESSAGE_BYTES
} from '../../src/integration/protocol'
import { CapabilityNegotiator } from '../../src/integration/capability-negotiation'

const nonce = 'nonce-1'
const capabilities = {
  browser: 'chromium' as const,
  sidePanel: true,
  sidebar: false,
  tabs: true,
  tabGroups: true,
  clipboard: false,
  capture: true,
  fullPageCapture: false,
  contextTextInsert: true
}

describe('browser-neutral bridge protocol', () => {
  it('creates and validates a typed versioned message', () => {
    const message = createBridgeMessage('hello', nonce, {
      client: 'open-webui'
    })
    expect(message.protocol).toBe(BRIDGE_PROTOCOL)
    expect(isBridgeMessage(message)).toBe(true)
  })

  it('rejects malformed, unknown, and oversized messages', () => {
    expect(isBridgeMessage({ version: 1, id: 'x', type: 'hello' })).toBe(false)
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'x',
        nonce,
        type: 'unknown'
      })
    ).toBe(false)
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'x',
        nonce,
        type: 'hello',
        payload: 'not a hello payload'
      })
    ).toBe(false)
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'x',
        nonce,
        type: 'event',
        payload: { name: 'not-an-event', data: null }
      })
    ).toBe(false)
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'x',
        nonce,
        type: 'event',
        payload: { name: 'context', data: 'x'.repeat(MAX_MESSAGE_BYTES) }
      })
    ).toBe(false)
  })

  it('rejects insertion payloads with images or oversized UTF-8 text', () => {
    const item = {
      id: 'item-1',
      kind: 'page',
      title: 'Page',
      createdAt: 1,
      truncated: false
    }
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'request-1',
        nonce,
        type: 'event',
        payload: {
          name: 'context:insert-text',
          data: {
            text: 'text',
            item: { ...item, dataUrl: 'data:image/png;base64,abc' }
          }
        }
      })
    ).toBe(false)
    expect(
      isBridgeMessage({
        protocol: BRIDGE_PROTOCOL,
        version: 1,
        id: 'request-2',
        nonce,
        type: 'event',
        payload: {
          name: 'context:insert-text',
          data: { text: '😀'.repeat(20_000), item }
        }
      })
    ).toBe(false)
  })

  it('derives contextTextInsert support from the environment', async () => {
    const { supportsContextTextInsert } =
      await import('../../src/integration/protocol')
    expect(supportsContextTextInsert()).toBe(true)
    vi.stubGlobal('crypto', {})
    try {
      expect(supportsContextTextInsert()).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('allows only the exact non-null expected origin', () => {
    expect(
      isAllowedBridgeOrigin('https://webui.example', 'https://webui.example')
    ).toBe(true)
    expect(
      isAllowedBridgeOrigin(
        'https://webui.example.evil',
        'https://webui.example'
      )
    ).toBe(false)
    expect(isAllowedBridgeOrigin('null', 'https://webui.example')).toBe(false)
    expect(isAllowedBridgeOrigin('https://webui.example', 'null')).toBe(false)
  })

  it('validates origin, source, nonce, and message together', () => {
    const source = {} as Window
    const event = {
      source,
      origin: 'https://webui.example',
      data: createBridgeMessage('hello', nonce, { client: 'open-webui' })
    } as MessageEvent
    expect(
      isBridgeMessageEvent(event, 'https://webui.example', nonce, source)
    ).toBe(true)
    expect(
      isBridgeMessageEvent(
        { ...event, origin: 'https://evil.example' },
        'https://webui.example',
        nonce,
        source
      )
    ).toBe(false)
    expect(
      isBridgeMessageEvent(
        { ...event, source: {} as Window },
        'https://webui.example',
        nonce,
        source
      )
    ).toBe(false)
    expect(
      isBridgeMessageEvent(
        { ...event, data: { ...event.data, nonce: 'replayed' } },
        'https://webui.example',
        nonce,
        source
      )
    ).toBe(false)
  })
})

describe('capability negotiation', () => {
  it('responds to hello with only the capability report', () => {
    const send = vi.fn()
    const negotiator = new CapabilityNegotiator({ nonce, capabilities, send })
    const hello = createBridgeMessage('hello', nonce, { client: 'open-webui' })
    expect(negotiator.handleHello(hello)).toBe(true)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'capabilities',
        nonce,
        payload: { capabilities }
      })
    )
    expect(negotiator.isNegotiated).toBe(true)
    expect(
      negotiator.handleHello(
        createBridgeMessage('request', nonce, { name: 'context:list' })
      )
    ).toBe(false)
  })

  it('includes contextTextInsert in capability report', () => {
    const send = vi.fn()
    const negotiator = new CapabilityNegotiator({ nonce, capabilities, send })
    const hello = createBridgeMessage('hello', nonce, { client: 'open-webui' })
    negotiator.handleHello(hello)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          capabilities: expect.objectContaining({
            contextTextInsert: true
          })
        })
      })
    )
  })
})
