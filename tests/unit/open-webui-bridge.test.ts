// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { createOpenWebUIBridge } from '../../src/content/open-webui-bridge'
import {
  createBridgeMessage,
  MAX_CONTEXT_TEXT_BYTES
} from '../../src/integration/protocol'
import type { ContextItem } from '../../src/shared/types'
import ContextTray from '../../src/ui/ContextTray.svelte'

vi.mock('../../src/browser/platform', () => ({
  capabilities: vi.fn().mockResolvedValue({
    browser: 'chromium',
    sidePanel: true,
    sidebar: false,
    tabs: true,
    tabGroups: true,
    clipboard: true,
    capture: true,
    fullPageCapture: false
  })
}))

const origin = 'https://webui.example'
const makeItem = (overrides: Partial<ContextItem> = {}): ContextItem => ({
  id: 'item-1',
  kind: 'page',
  title: 'Page title',
  sourceUrl: 'https://private.example/path',
  text: 'hello world',
  createdAt: 1,
  pinned: false,
  truncated: false,
  ...overrides
})

function createTestBridge() {
  const posted: ReturnType<typeof createBridgeMessage>[] = []
  const bridge = createOpenWebUIBridge({
    targetOrigin: origin,
    capabilityReport: {
      browser: 'chromium',
      sidePanel: true,
      sidebar: false,
      tabs: true,
      tabGroups: true,
      clipboard: true,
      capture: true,
      fullPageCapture: false
    },
    postMessage: (message) => posted.push(message)
  })
  return { bridge, posted }
}

function dispatchEvent(
  bridgeNonce: string,
  message: ReturnType<typeof createBridgeMessage>,
  overrides: Record<string, unknown> = {}
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: message,
      origin,
      source: window,
      ...overrides
    })
  )
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('open-webui-bridge text insertion contract', () => {
  it('negotiates host support without inserting automatically', () => {
    const onCapabilities = vi.fn()
    const { bridge, posted } = createTestBridge()
    const withCallback = createOpenWebUIBridge({
      targetOrigin: origin,
      postMessage: (message) => posted.push(message),
      onHostCapabilities: onCapabilities
    })
    withCallback.start()
    dispatchEvent(
      withCallback.nonce,
      createBridgeMessage('hello:ack', withCallback.nonce, {
        capabilities: { contextTextInsert: true }
      })
    )
    dispatchEvent(
      withCallback.nonce,
      createBridgeMessage('capabilities', withCallback.nonce, {
        capabilities: { contextTextInsert: true }
      })
    )
    expect(onCapabilities).toHaveBeenCalledWith({ contextTextInsert: true })
    expect(posted.filter((m) => m.type === 'event')).toHaveLength(0)
    bridge.stop()
    withCallback.stop()
  })

  it('sends bounded text and sanitized metadata only when explicitly called', () => {
    const { bridge, posted } = createTestBridge()
    bridge.start()
    const acknowledgement = bridge.insertText(makeItem())
    const sent = posted.find(
      (m) =>
        m.type === 'event' &&
        (m.payload as { name?: string })?.name === 'context:insert-text'
    )
    expect(sent?.type).toBe('event')
    expect(sent?.payload).toEqual({
      name: 'context:insert-text',
      data: {
        text: 'hello world',
        item: {
          id: 'item-1',
          kind: 'page',
          title: 'Page title',
          createdAt: 1,
          truncated: false
        }
      }
    })
    expect(JSON.stringify(sent)).not.toContain('private.example')
    expect(JSON.stringify(sent)).not.toContain('submit')
    void acknowledgement.catch(() => undefined)
    bridge.stop()
  })

  it('exposes an Insert action per context card when supported', async () => {
    const onInsert = vi.fn()
    const component = mount(ContextTray, {
      target: document.body,
      props: {
        items: [
          makeItem({ id: 'item-1', title: 'First' }),
          makeItem({ id: 'item-2', title: 'Second' })
        ],
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onClear: vi.fn(),
        onExport: vi.fn(),
        onInsert,
        contextTextInsert: true
      }
    })
    await tick()
    const insertButtons = Array.from(
      document.querySelectorAll('button[aria-label^="Insert "]')
    ) as HTMLButtonElement[]
    expect(insertButtons).toHaveLength(2)
    insertButtons[1].click()
    expect(onInsert).toHaveBeenCalledOnce()
    expect(onInsert.mock.calls[0][0].id).toBe('item-2')
    unmount(component)
  })

  it('rejects oversized text and image context before posting', async () => {
    const { bridge, posted } = createTestBridge()
    bridge.start()
    await expect(
      bridge.insertText(
        makeItem({ text: 'x'.repeat(MAX_CONTEXT_TEXT_BYTES + 1) })
      )
    ).rejects.toThrow('Text context exceeds the bridge limit.')
    await expect(
      bridge.insertText(
        makeItem({ kind: 'screenshot', dataUrl: 'data:image/png;base64,abc' })
      )
    ).rejects.toThrow('Image context cannot be inserted as text.')
    expect(posted.filter((m) => m.type === 'event')).toHaveLength(0)
    bridge.stop()
  })

  it('resolves only a valid same-origin, same-source, same-nonce acknowledgement', async () => {
    const { bridge, posted } = createTestBridge()
    bridge.start()
    const acknowledgement = bridge.insertText(makeItem())
    const sent = posted.find(
      (m) =>
        m.type === 'event' &&
        (m.payload as { name?: string })?.name === 'context:insert-text'
    )!
    // Wrong nonce - should not resolve
    dispatchEvent(
      'wrong-nonce',
      createBridgeMessage(
        'response',
        'wrong-nonce',
        { ok: true, result: { inserted: true } },
        sent.id
      )
    )
    // Wrong origin - should not resolve
    dispatchEvent(
      bridge.nonce,
      createBridgeMessage(
        'response',
        bridge.nonce,
        { ok: true, result: { inserted: true } },
        sent.id
      ),
      { origin: 'https://evil.example' }
    )
    let settled = false
    void acknowledgement.finally(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    // Correct nonce and origin - should resolve
    dispatchEvent(
      bridge.nonce,
      createBridgeMessage(
        'response',
        bridge.nonce,
        { ok: true, result: { inserted: true } },
        sent.id
      )
    )
    await expect(acknowledgement).resolves.toEqual({ inserted: true })
    bridge.stop()
  })

  it('shows per-card Insert only when host support is acknowledged and retains Copy context', async () => {
    const onInsert = vi.fn()
    const component = mount(ContextTray, {
      target: document.body,
      props: {
        items: [makeItem()],
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onClear: vi.fn(),
        onExport: vi.fn(),
        onInsert,
        contextTextInsert: false
      }
    })
    expect(document.body.textContent).not.toContain('Insert into chat')
    expect(document.body.textContent).toContain('Copy context')
    unmount(component)

    const supported = mount(ContextTray, {
      target: document.body,
      props: {
        items: [makeItem()],
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onClear: vi.fn(),
        onExport: vi.fn(),
        onInsert,
        contextTextInsert: true
      }
    })
    await tick()
    const insert = Array.from(
      document.querySelectorAll('button[aria-label^="Insert "]')
    )[0] as HTMLButtonElement
    insert.click()
    expect(onInsert.mock.calls[0][0].id).toBe('item-1')
    expect(onInsert).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('Copy context')
    unmount(supported)
  })
})
