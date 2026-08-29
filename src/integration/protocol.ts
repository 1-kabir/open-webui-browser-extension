import type { CapabilityReport, ContextKind } from '../shared/types'

export const BRIDGE_PROTOCOL = 'open-webui-browser-bridge'
export const BRIDGE_VERSION = 1 as const
export const MAX_MESSAGE_BYTES = 64 * 1024
export const MAX_ID_LENGTH = 128
export const MAX_NONCE_LENGTH = 128
export const MAX_CONTEXT_TEXT_BYTES = 32 * 1024

export type BridgeMessageType =
  'hello' | 'hello:ack' | 'capabilities' | 'request' | 'response' | 'event'

export interface BridgeMessage<T = unknown> {
  readonly protocol: typeof BRIDGE_PROTOCOL
  readonly version: typeof BRIDGE_VERSION
  readonly id: string
  readonly nonce: string
  readonly type: BridgeMessageType
  readonly payload?: T
}

export interface HelloPayload {
  readonly client: 'open-webui'
  readonly connectionId?: string
}

export interface HelloAckPayload {
  readonly capabilities?: Pick<CapabilityReport, 'contextTextInsert'>
}

export interface CapabilityPayload {
  readonly capabilities: CapabilityReport
}

export interface RequestPayload {
  readonly name: string
  readonly args?: unknown
}

export interface ResponsePayload {
  readonly ok: boolean
  readonly result?: unknown
  readonly error?: { readonly code: string; readonly message: string }
}

export interface InsertTextItem {
  readonly id: string
  readonly kind: ContextKind
  readonly title: string
  readonly createdAt: number
  readonly truncated: boolean
}

export interface InsertTextArgs {
  readonly text: string
  readonly item: InsertTextItem
}

export interface EventPayload {
  readonly name:
    | 'capabilities'
    | 'context'
    | 'context:insert-text'
    | 'theme'
    | 'navigation'
    | 'connection'
  readonly data: unknown
}

const types = new Set<BridgeMessageType>([
  'hello',
  'hello:ack',
  'capabilities',
  'request',
  'response',
  'event'
])

const contextKinds = new Set<ContextKind>([
  'page',
  'selection',
  'tabs',
  'tab-groups',
  'clipboard',
  'screenshot',
  'html'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maxLength
  )
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function isBoundedContextText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    utf8ByteLength(value) <= MAX_CONTEXT_TEXT_BYTES
  )
}

export function isValidInsertTextArgs(value: unknown): value is InsertTextArgs {
  if (!isRecord(value) || !isBoundedContextText(value.text)) return false
  if (
    Object.keys(value).some((key) => !new Set(['text', 'item']).has(key))
  )
    return false
  if (!isRecord(value.item)) return false
  const item = value.item
  const allowedKeys = new Set(['id', 'kind', 'title', 'createdAt', 'truncated'])
  if (Object.keys(item).some((key) => !allowedKeys.has(key))) return false
  return (
    isSafeString(item.id, MAX_ID_LENGTH) &&
    typeof item.kind === 'string' &&
    contextKinds.has(item.kind as ContextKind) &&
    isSafeString(item.title, 500) &&
    typeof item.createdAt === 'number' &&
    Number.isFinite(item.createdAt) &&
    typeof item.truncated === 'boolean'
  )
}

export function createBridgeMessage<T>(
  type: BridgeMessageType,
  nonce: string,
  payload?: T,
  id: string = crypto.randomUUID()
): BridgeMessage<T> {
  if (!isSafeString(nonce, MAX_NONCE_LENGTH))
    throw new Error('Invalid bridge nonce.')
  if (!isSafeString(id, MAX_ID_LENGTH))
    throw new Error('Invalid bridge message ID.')
  const message: BridgeMessage<T> = {
    protocol: BRIDGE_PROTOCOL,
    version: BRIDGE_VERSION,
    id,
    nonce,
    type,
    ...(payload === undefined ? {} : { payload })
  }
  if (!isBridgeMessage(message)) throw new Error('Invalid bridge message.')
  return message
}

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!isRecord(value)) return false
  if (
    value.protocol !== BRIDGE_PROTOCOL ||
    value.version !== BRIDGE_VERSION ||
    !isSafeString(value.id, MAX_ID_LENGTH) ||
    !isSafeString(value.nonce, MAX_NONCE_LENGTH) ||
    typeof value.type !== 'string' ||
    !types.has(value.type as BridgeMessageType)
  )
    return false

  if (!isValidPayload(value.type as BridgeMessageType, value.payload))
    return false
  try {
    const serialized = JSON.stringify(value)
    return (
      serialized !== undefined &&
      utf8ByteLength(serialized) <= MAX_MESSAGE_BYTES
    )
  } catch {
    return false
  }
}

function isValidPayload(type: BridgeMessageType, payload: unknown): boolean {
  if (payload === undefined)
    return (
      type === 'hello:ack' || type === 'capabilities' || type === 'response'
    )
  if (!isRecord(payload)) return false

  if (type === 'hello') {
    return (
      payload.client === 'open-webui' &&
      (payload.connectionId === undefined ||
        isSafeString(payload.connectionId, MAX_ID_LENGTH))
    )
  }
  if (type === 'hello:ack') {
    if (payload.capabilities === undefined) return true
    return (
      isRecord(payload.capabilities) &&
      (payload.capabilities.contextTextInsert === undefined ||
        typeof payload.capabilities.contextTextInsert === 'boolean')
    )
  }
  if (type === 'capabilities') return isRecord(payload.capabilities)
  if (type === 'request') {
    if (!isSafeString(payload.name, MAX_ID_LENGTH)) return false
    return payload.name === 'context:insert-text'
      ? isValidInsertTextArgs(payload.args)
      : true
  }
  if (type === 'event') {
    if (
      ![
        'capabilities',
        'context',
        'context:insert-text',
        'theme',
        'navigation',
        'connection'
      ].includes(String(payload.name)) ||
      !('data' in payload)
    )
      return false
    return payload.name === 'context:insert-text'
      ? isValidInsertTextArgs(payload.data)
      : true
  }
  if (type === 'response') {
    return (
      typeof payload.ok === 'boolean' &&
      (payload.error === undefined ||
        (isRecord(payload.error) &&
          isSafeString(payload.error.code, MAX_ID_LENGTH) &&
          isSafeString(payload.error.message, MAX_MESSAGE_BYTES)))
    )
  }
  return false
}

export function isAllowedBridgeOrigin(
  origin: string,
  expectedOrigin: string
): boolean {
  if (
    !origin ||
    origin === 'null' ||
    !expectedOrigin ||
    expectedOrigin === 'null'
  )
    return false
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin
  } catch {
    return false
  }
}

export function isBridgeMessageEvent(
  event: MessageEvent<unknown>,
  expectedOrigin: string,
  expectedNonce: string,
  expectedSource?: Window
): event is MessageEvent<BridgeMessage> {
  return (
    (!expectedSource || event.source === expectedSource) &&
    isAllowedBridgeOrigin(event.origin, expectedOrigin) &&
    isBridgeMessage(event.data) &&
    event.data.nonce === expectedNonce
  )
}
