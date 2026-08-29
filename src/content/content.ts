import browser from 'webextension-polyfill'
import { installOpenWebUIBridge } from './open-webui-bridge'
import {
  isValidInsertTextArgs,
  MAX_CONTEXT_TEXT_BYTES
} from '../integration/protocol'

// The content script is deliberately inert outside a normal web page. The bridge
// only accepts messages from this page's origin and never exposes browser APIs.
if (typeof window !== 'undefined' && window.top === window) {
  const bridgeRequest = async (
    name: string,
    args: unknown
  ): Promise<unknown> => {
    const messageByName: Record<string, string> = {
      'context:list': 'context:list',
      'context:stage': 'context:stage',
      'context:remove': 'context:remove',
      'theme:get': 'settings:get',
      'navigation:get': 'navigation:get',
      'context:insert-text': 'context:insert-text'
    }
    const type = messageByName[name]
    if (!type) throw new Error('Unsupported integration request.')
    const message: Record<string, unknown> = { type }
    if (name === 'context:stage') {
      if (!args || typeof args !== 'object' || Array.isArray(args))
        throw new Error('A context item is required.')
      message.item = (args as Record<string, unknown>).item
    } else if (name === 'context:remove') {
      if (!args || typeof args !== 'object' || Array.isArray(args))
        throw new Error('A context ID is required.')
      message.id = (args as Record<string, unknown>).id
    } else if (name === 'context:insert-text') {
      if (!isValidInsertTextArgs(args))
        throw new Error('Invalid text insertion payload.')
      const encodedText = new TextEncoder().encode(args.text).byteLength
      if (encodedText > MAX_CONTEXT_TEXT_BYTES)
        throw new Error('Text context exceeds the bridge limit.')
      message.text = args.text
      message.item = args.item
    }
    const response = (await browser.runtime.sendMessage(message)) as {
      error?: string
    }
    if (response.error) throw new Error(response.error)
    return response
  }
  installOpenWebUIBridge({
    targetOrigin: window.location.origin,
    request: bridgeRequest
  })
}
