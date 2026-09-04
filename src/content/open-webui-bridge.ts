import { capabilities } from '../browser/platform'
import {
  createBridgeMessage,
  isBridgeMessageEvent,
  isBridgeMessage,
  isValidInsertTextArgs,
  supportsContextTextInsert,
  MAX_CONTEXT_TEXT_BYTES,
  type BridgeMessage,
  type RequestPayload,
  type ResponsePayload
} from '../integration/protocol'
import { CapabilityNegotiator } from '../integration/capability-negotiation'
import type { ContextItem } from '../shared/types'

export interface OpenWebUIBridgeOptions {
  readonly targetOrigin?: string
  readonly postMessage?: (message: BridgeMessage) => void
  readonly request?: (name: string, args: unknown) => Promise<unknown> | unknown
  readonly capabilityReport?: Awaited<ReturnType<typeof capabilities>>
  readonly expectedSource?: Window
  readonly onHostCapabilities?: (capabilities: unknown) => void
}

export interface InsertTextAcknowledgement {
  readonly inserted: boolean
}

export interface OpenWebUIBridge {
  readonly nonce: string
  readonly origin: string
  start(): void
  stop(): void
  sendEvent(
    name:
      | 'capabilities'
      | 'context'
      | 'context:insert-text'
      | 'theme'
      | 'navigation'
      | 'connection',
    data: unknown
  ): void
  insertText(item: ContextItem): Promise<InsertTextAcknowledgement>
}

const REQUEST_NAMES = new Set([
  'context:stage',
  'context:remove',
  'context:list',
  'theme:get',
  'navigation:get',
  'context:insert-text'
])

function makeNonce(): string {
  return crypto.randomUUID()
}

function postToPage(
  message: BridgeMessage,
  post: (message: BridgeMessage) => void
): void {
  post(message)
}

function isCapabilityReport(
  value: unknown
): value is { contextTextInsert?: boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ('contextTextInsert' in value
      ? typeof (value as { contextTextInsert?: unknown }).contextTextInsert ===
        'boolean'
      : true)
  )
}

function isInsertTextAcknowledgement(
  value: unknown
): value is InsertTextAcknowledgement {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as { inserted?: unknown }).inserted === 'boolean'
  )
}

export function createOpenWebUIBridge(
  options: OpenWebUIBridgeOptions = {}
): OpenWebUIBridge {
  const origin = options.targetOrigin ?? window.location.origin
  const expectedSource = options.expectedSource ?? window
  const nonce = makeNonce()
  const seenRequestIds = new Set<string>()
  const pendingInsertText = new Map<
    string,
    {
      resolve: (value: InsertTextAcknowledgement) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  const post =
    options.postMessage ??
    ((message: BridgeMessage) => {
      window.postMessage(message, origin)
    })
  const reportPromise = (
    options.capabilityReport
      ? Promise.resolve(options.capabilityReport)
      : capabilities()
  ).then((report) => ({
    ...report,
    contextTextInsert: supportsContextTextInsert()
  }))
  let started = false
  let negotiator: CapabilityNegotiator | undefined

  const handleHostCapabilities = (value: unknown): void => {
    if (!isCapabilityReport(value)) return
    options.onHostCapabilities?.(value)
  }

  const sendEvent = (
    name:
      | 'capabilities'
      | 'context'
      | 'context:insert-text'
      | 'theme'
      | 'navigation'
      | 'connection',
    data: unknown
  ): void => {
    if (!started) return
    postToPage(createBridgeMessage('event', nonce, { name, data }), post)
  }

  const onMessage = (event: MessageEvent<unknown>): void => {
    if (!isBridgeMessage(event.data)) return
    // The page must use this page-session nonce and exact source/origin. This
    // rejects frames, stale sessions, malformed payloads, and replayed messages.
    if (!isBridgeMessageEvent(event, origin, nonce, expectedSource)) return

    if (event.data.type === 'hello:ack') {
      const payload = event.data.payload as
        { capabilities?: unknown } | undefined
      if (payload?.capabilities !== undefined)
        handleHostCapabilities(payload.capabilities)
      return
    }

    if (event.data.type === 'response') {
      const pending = pendingInsertText.get(event.data.id)
      if (!pending) return
      pendingInsertText.delete(event.data.id)
      clearTimeout(pending.timer)
      const payload = event.data.payload as ResponsePayload | undefined
      if (payload?.ok === true && isInsertTextAcknowledgement(payload.result)) {
        pending.resolve(payload.result)
      } else {
        pending.reject(new Error('Host did not acknowledge text insertion.'))
      }
      return
    }

    if (event.data.type === 'event') {
      const payload = event.data.payload as
        { name?: string; data?: unknown } | undefined
      if (payload?.name === 'capabilities') handleHostCapabilities(payload.data)
      return
    }

    if (event.data.type !== 'hello' && event.data.type !== 'request') return

    if (event.data.type === 'hello') {
      void reportPromise.then((report) => {
        if (!started) return
        if (!negotiator) {
          negotiator = new CapabilityNegotiator({
            nonce,
            capabilities: report,
            send: post
          })
        }
        negotiator.handleHello(event.data)
        sendEvent('capabilities', report)
      })
      return
    }

    if (seenRequestIds.has(event.data.id)) return
    seenRequestIds.add(event.data.id)
    if (seenRequestIds.size > 1_024) {
      const oldest = seenRequestIds.values().next().value
      if (oldest) seenRequestIds.delete(oldest)
    }
    const payload = event.data.payload as RequestPayload | undefined
    if (
      !payload ||
      typeof payload.name !== 'string' ||
      !REQUEST_NAMES.has(payload.name)
    ) {
      postToPage(
        createBridgeMessage<ResponsePayload>(
          'response',
          nonce,
          {
            ok: false,
            error: {
              code: 'unsupported_request',
              message: 'Unsupported bridge request.'
            }
          },
          event.data.id
        ),
        post
      )
      return
    }
    void Promise.resolve(options.request?.(payload.name, payload.args)).then(
      (result) =>
        postToPage(
          createBridgeMessage<ResponsePayload>(
            'response',
            nonce,
            { ok: true, result },
            event.data.id
          ),
          post
        ),
      () =>
        postToPage(
          createBridgeMessage<ResponsePayload>(
            'response',
            nonce,
            {
              ok: false,
              error: {
                code: 'request_failed',
                message: 'Bridge request failed.'
              }
            },
            event.data.id
          ),
          post
        )
    )
  }

  const insertText = (
    item: ContextItem
  ): Promise<InsertTextAcknowledgement> => {
    if (!started) return Promise.reject(new Error('Bridge is not started.'))
    if (item.dataUrl !== undefined)
      return Promise.reject(
        new Error('Image context cannot be inserted as text.')
      )
    if (!item.text)
      return Promise.reject(new Error('Item has no text to insert.'))
    if (new TextEncoder().encode(item.text).byteLength > MAX_CONTEXT_TEXT_BYTES)
      return Promise.reject(new Error('Text context exceeds the bridge limit.'))

    const args = {
      text: item.text,
      item: {
        id: item.id,
        kind: item.kind,
        title: item.title,
        createdAt: item.createdAt,
        truncated: item.truncated
      }
    }
    if (!isValidInsertTextArgs(args))
      return Promise.reject(new Error('Invalid text insertion payload.'))

    const message = createBridgeMessage('event', nonce, {
      name: 'context:insert-text',
      data: args
    })
    if (!isBridgeMessage(message))
      return Promise.reject(new Error('Invalid text insertion payload.'))

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingInsertText.delete(message.id)
        reject(new Error('Insert text request timed out.'))
      }, 5_000)
      pendingInsertText.set(message.id, { resolve, reject, timer })
      postToPage(message, post)
    })
  }

  return {
    nonce,
    origin,
    start(): void {
      if (started) return
      started = true
      window.addEventListener('message', onMessage)
      postToPage(
        createBridgeMessage('hello', nonce, { client: 'open-webui' }),
        post
      )
    },
    stop(): void {
      if (!started) return
      started = false
      window.removeEventListener('message', onMessage)
      seenRequestIds.clear()
      for (const pending of pendingInsertText.values()) {
        clearTimeout(pending.timer)
        pending.reject(new Error('Bridge stopped.'))
      }
      pendingInsertText.clear()
    },
    sendEvent,
    insertText
  }
}

export function installOpenWebUIBridge(
  options: OpenWebUIBridgeOptions = {}
): OpenWebUIBridge {
  const bridge = createOpenWebUIBridge(options)
  bridge.start()
  return bridge
}
