import { browser, capabilities } from '../browser/platform'
import {
  addConnection,
  getSettings,
  removeConnection,
  setDefaultConnection
} from './connection-manager'
import { normalizeConnectionUrl } from '../shared/validation'
browser.runtime.onInstalled.addListener(() => {
  void getSettings()
})
browser.runtime.onMessage.addListener(async (message: any) => {
  try {
    switch (message?.type) {
      case 'settings:get':
        return getSettings()
      case 'connections:add':
        return addConnection(message.input)
      case 'connections:remove':
        return removeConnection(message.id)
      case 'connections:set-default':
        return setDefaultConnection(message.id)
      case 'capabilities:get':
        return capabilities()
      case 'connection:validate': {
        const url = normalizeConnectionUrl(message.url)
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        })
        return { ok: response.ok, url }
      }
      default:
        return undefined
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Request failed.' }
  }
})
browser.action.onClicked.addListener(async () => {
  const api = browser as any
  if (api.sidePanel?.open) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    })
    if (tab?.windowId != null)
      await api.sidePanel.open({ windowId: tab.windowId })
    return
  }
  await browser.tabs.create({ url: browser.runtime.getURL('sidepanel.html') })
})
