import type { CapabilityReport } from '../shared/types'
import {
  createBridgeMessage,
  type BridgeMessage,
  type CapabilityPayload
} from './protocol'

export interface CapabilityNegotiatorOptions {
  readonly nonce: string
  readonly capabilities: CapabilityReport
  readonly send: (message: BridgeMessage<CapabilityPayload>) => void
}

/** Sends the extension capability report without exposing extension APIs. */
export class CapabilityNegotiator {
  private readonly options: CapabilityNegotiatorOptions
  private negotiated = false

  constructor(options: CapabilityNegotiatorOptions) {
    this.options = options
  }

  get isNegotiated(): boolean {
    return this.negotiated
  }

  handleHello(message: BridgeMessage): boolean {
    if (message.type !== 'hello') return false
    this.options.send(
      createBridgeMessage('capabilities', this.options.nonce, {
        capabilities: this.options.capabilities
      })
    )
    this.negotiated = true
    return true
  }
}
