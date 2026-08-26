import { capabilities } from '../browser/platform'
import {
  createBridgeMessage,
  isBridgeMessageEvent,
  isBridgeMessage,
  type BridgeMessage,
  type RequestPayload,
  type ResponsePayload
} from '../integration/protocol'
import { CapabilityNegotiator } from '../integration/capability-negotiation'

export interface OpenWebUIBridgeOptions {
  readonly targetOrigin?: string
  readonly postMessage?: (message: BridgeMessage) => void
  readonly request?: (name: string, args: unknown) => Promise<unknown> | unknown
  readonly capabilityReport?: Awaited<ReturnType<typeof capabilities>>
}

export interface OpenWebUIBridge {
  readonly nonce: string
  readonly origin: string
  start(): void
  stop(): void
  sendEvent(
    name: 'capabilities' | 'context' | 'theme' | 'navigation' | 'connection',
    data: unknown
  ): void
}

const REQUEST_NAMES = new Set([
  'context:stage',
  'context:remove',
  'context:list',
  'theme:get',
  'navigation:get'
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

export function createOpenWebUIBridge(
  options: OpenWebUIBridgeOptions = {}
): OpenWebUIBridge {
  const origin = options.targetOrigin ?? window.location.origin
  const nonce = makeNonce()
  const seenRequestIds = new Set<string>()
  const post =
    options.postMessage ??
    ((message: BridgeMessage) => {
      window.postMessage(message, origin)
    })
  const reportPromise = options.capabilityReport
    ? Promise.resolve(options.capabilityReport)
    : capabilities()
  let started = false
  let negotiator: CapabilityNegotiator | undefined

  const sendEvent = (
    name: 'capabilities' | 'context' | 'theme' | 'navigation' | 'connection',
    data: unknown
  ): void => {
    if (!started) return
    postToPage(createBridgeMessage('event', nonce, { name, data }), post)
  }

  const onMessage = (event: MessageEvent<unknown>): void => {
    if (!isBridgeMessage(event.data)) return
    // The initial hello is sent by this bridge, so every later page message must
    // use the bridge nonce. This also rejects messages from frames and replays.
    if (event.data.type === 'hello:ack') {
      if (!isBridgeMessageEvent(event, origin, nonce, window)) return
      return
    }
    if (!isBridgeMessageEvent(event, origin, nonce, window)) return
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
    },
    sendEvent
  }
}

export function installOpenWebUIBridge(
  options: OpenWebUIBridgeOptions = {}
): OpenWebUIBridge {
  const bridge = createOpenWebUIBridge(options)
  bridge.start()
  return bridge
}
