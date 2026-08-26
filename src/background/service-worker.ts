import { browser, capabilities } from '../browser/platform'
import {
  addConnection,
  getSettings,
  removeConnection,
  setDefaultConnection
} from './connection-manager'
import { normalizeConnectionUrl } from '../shared/validation'
import { readTabGroups } from '../browser/tab-groups'
import { readTabs } from '../browser/tabs'
import { readClipboardText } from '../browser/clipboard'
import { captureVisibleTab } from '../browser/capture'
import {
  clearContext,
  listContext,
  removeContext,
  stageContext
} from './context-manager'
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
      case 'tabs:read':
        return readTabs(message.ids)
      case 'tab-groups:read':
        return readTabGroups()
      case 'clipboard:read':
        return readClipboardText()
      case 'capture:visible':
        return captureVisibleTab(message.windowId)
      case 'context:list':
        return listContext()
      case 'context:stage':
        return stageContext(message.item)
      case 'context:remove':
        return removeContext(message.id)
      case 'context:clear':
        return clearContext()
      case 'page:read': {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tab.id == null) throw new Error('No active page is available.')
        const result = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            title: document.title,
            url: location.href,
            selection: (window.getSelection()?.toString() ?? '').slice(
              0,
              100000
            ),
            text: (document.body?.innerText ?? '').slice(0, 100000),
            html: (document.documentElement?.outerHTML ?? '').slice(0, 150000)
          })
        })
        return result[0]?.result
      }
      case 'connection:validate': {
        // Syntax validation is intentionally local. A remote fetch would require
        // broad host permissions before the user has approved a destination.
        return { ok: true, url: normalizeConnectionUrl(message.url) }
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
  await browser.tabs.create({
    url: browser.runtime.getURL('src/sidepanel/index.html')
  })
})
