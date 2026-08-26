import browser from 'webextension-polyfill'
import { installOpenWebUIBridge } from './open-webui-bridge'

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
      'navigation:get': 'navigation:get'
    }
    const type = messageByName[name]
    if (!type) throw new Error('Unsupported integration request.')
    const response = (await browser.runtime.sendMessage({
      type,
      ...(args && typeof args === 'object' ? args : {})
    })) as { error?: string }
    if (response.error) throw new Error(response.error)
    return response
  }
  installOpenWebUIBridge({
    targetOrigin: window.location.origin,
    request: bridgeRequest
  })
}
