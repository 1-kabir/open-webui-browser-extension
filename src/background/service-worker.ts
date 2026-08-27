import { browser } from '../browser/platform'
import { getSettings } from './connection-manager'
import { routeMessage } from './message-router'
import type { Runtime } from 'webextension-polyfill'

browser.runtime.onInstalled.addListener(() => {
  void getSettings()
})
browser.runtime.onMessage.addListener(
  (message: unknown, sender: Runtime.MessageSender) =>
    routeMessage(message, sender)
)
browser.action.onClicked.addListener(async () => {
  const api = browser as any
  try {
    if (api.sidePanel?.open) {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tab?.windowId != null)
        await api.sidePanel.open({ windowId: tab.windowId })
      return
    }
    if (api.sidebarAction?.open) {
      await api.sidebarAction.open()
      return
    }
    await browser.tabs.create({
      url: browser.runtime.getURL('src/fallback-tab/index.html')
    })
  } catch {
    await browser.tabs.create({
      url: browser.runtime.getURL('src/fallback-tab/index.html')
    })
  }
})
