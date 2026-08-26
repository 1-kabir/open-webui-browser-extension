import { browser, capabilities } from '../browser/platform'
import {
  addConnection,
  getSettings,
  removeConnection,
  setDefaultConnection,
  updateConnection,
  updateSettings
} from './connection-manager'
import { normalizeConnectionUrl } from '../shared/validation'
import { readTabGroups } from '../browser/tab-groups'
import { readTabs } from '../browser/tabs'
import { readClipboardText } from '../browser/clipboard'
import { captureVisibleTab } from '../browser/capture'
import { LIMITS } from '../shared/limits'
import {
  getPermissionState,
  removePermission,
  requestPermission
} from './permission-manager'
import { isContextItem, isId, isTabIds } from '../shared/message-validation'
import {
  clearContext,
  listContext,
  removeContext,
  pinContext,
  stageContext,
  clearUnpinnedContext
} from './context-manager'
browser.runtime.onInstalled.addListener(() => {
  void getSettings()
})
browser.runtime.onMessage.addListener(
  async (message: any, sender: browser.Runtime.MessageSender) => {
    try {
      const bridgeTypes = new Set([
        'context:list',
        'context:stage',
        'context:remove',
        'theme:get',
        'navigation:get'
      ])
      if (bridgeTypes.has(message?.type)) {
        // Only a top-level content script can act as the page bridge. Extension
        // pages (panels/settings) must use their own privileged message paths;
        // otherwise an arbitrary extension page could be mistaken for WebUI.
        const senderUrl = sender.tab?.url
        if (!sender.tab || sender.frameId !== 0 || !senderUrl)
          throw new Error('Bridge requests require a WebUI page sender.')
        const configured = (await getSettings()).connections.some(
          (connection) => {
            try {
              return (
                senderUrl != null &&
                new URL(senderUrl).origin === new URL(connection.url).origin
              )
            } catch {
              return false
            }
          }
        )
        if (!configured)
          throw new Error(
            'Bridge requests are only allowed from a configured Open WebUI origin.'
          )
      }
      switch (message?.type) {
        case 'settings:get':
          return getSettings()
        case 'connections:add':
          return addConnection(message.input)
        case 'settings:update':
          return updateSettings(message.patch)
        case 'connections:update':
          if (!isId(message.id)) throw new Error('Invalid connection ID.')
          return updateConnection(message.id, message.input)
        case 'connections:remove':
          if (!isId(message.id)) throw new Error('Invalid connection ID.')
          return removeConnection(message.id)
        case 'connections:set-default':
          if (!isId(message.id)) throw new Error('Invalid connection ID.')
          return setDefaultConnection(message.id)
        case 'capabilities:get':
          return capabilities()
        case 'tabs:read':
          if (!isTabIds(message.ids)) throw new Error('Invalid tab selection.')
          if (!(await requestPermission('tabs')))
            throw new Error('Tab permission was not granted.')
          return readTabs(message.ids)
        case 'tab-groups:read':
          if (!(await requestPermission('tabs')))
            throw new Error('Tab permission was not granted.')
          return readTabGroups()
        case 'clipboard:read':
          if (!(await requestPermission('clipboardRead')))
            throw new Error('Clipboard permission was not granted.')
          return readClipboardText()
        case 'capture:visible':
          if (!(await requestPermission('activeTab')))
            throw new Error('Screenshot permission was not granted.')
          if (
            message.windowId !== undefined &&
            !Number.isInteger(message.windowId)
          )
            throw new Error('Invalid window ID.')
          return captureVisibleTab(message.windowId)
        case 'context:list':
          return listContext()
        case 'context:stage':
          if (!isContextItem(message.item))
            throw new Error('Invalid context item.')
          return stageContext(message.item)
        case 'context:remove':
          if (!isId(message.id)) throw new Error('Invalid context ID.')
          return removeContext(message.id)
        case 'context:pin':
          if (
            !isId(message.id) ||
            (message.pinned !== undefined &&
              typeof message.pinned !== 'boolean')
          )
            throw new Error('Invalid context pin request.')
          return pinContext(message.id, message.pinned !== false)
        case 'context:clear':
          return clearContext()
        case 'context:clear-unpinned':
          return clearUnpinnedContext()
        case 'page:read': {
          if (
            !(await requestPermission('activeTab')) ||
            !(await requestPermission('scripting'))
          )
            throw new Error('Page access permission was not granted.')
          const mode =
            message.mode === 'selection' || message.mode === 'html'
              ? message.mode
              : 'page'
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true
          })
          if (tab.id == null) throw new Error('No active page is available.')
          const result = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (
              requestedMode: 'page' | 'selection' | 'html',
              pageLimit: number,
              htmlLimit: number
            ) => {
              const bounded = (value: string, max: number) => ({
                value: value.slice(0, max),
                truncated: value.length > max
              })
              const selection = bounded(
                window.getSelection()?.toString() ?? '',
                pageLimit
              )
              const text = bounded(document.body?.innerText ?? '', pageLimit)
              const html = bounded(
                document.documentElement?.outerHTML ?? '',
                htmlLimit
              )
              return {
                title: document.title,
                url: location.href,
                selection: selection.value,
                text: requestedMode === 'page' ? text.value : '',
                html: requestedMode === 'html' ? html.value : '',
                textTruncated:
                  requestedMode === 'selection'
                    ? selection.truncated
                    : text.truncated,
                htmlTruncated: html.truncated
              }
            },
            args: [mode, LIMITS.pageText, LIMITS.html]
          })
          return result[0]?.result
        }
        case 'theme:get':
          return (await getSettings()).theme
        case 'navigation:get': {
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true
          })
          return tab?.id == null
            ? null
            : { title: tab.title ?? '', url: tab.url ?? '' }
        }
        case 'permissions:get':
          return getPermissionState()
        case 'permissions:remove':
          if (
            message.permission !== 'tabs' &&
            message.permission !== 'activeTab' &&
            message.permission !== 'scripting' &&
            message.permission !== 'clipboardRead'
          )
            throw new Error('Invalid permission.')
          return getPermissionState().then(async (state) => {
            await removePermission(message.permission)
            return { ...state, [message.permission]: false }
          })
        case 'connection:validate': {
          // Syntax validation is intentionally local. A remote fetch would require
          // broad host permissions before the user has approved a destination.
          return { ok: true, url: normalizeConnectionUrl(message.url) }
        }
        default:
          return undefined
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Request failed.'
      }
    }
  }
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
