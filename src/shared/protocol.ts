import type { ProtocolMessage } from './types'
export function createMessage(
  type: string,
  payload?: unknown,
  connectionId?: string
): ProtocolMessage {
  return { version: 1, id: crypto.randomUUID(), type, payload, connectionId }
}
export function isProtocolMessage(value: unknown): value is ProtocolMessage {
  const v = value as ProtocolMessage
  return (
    !!v &&
    v.version === 1 &&
    typeof v.id === 'string' &&
    typeof v.type === 'string'
  )
}
