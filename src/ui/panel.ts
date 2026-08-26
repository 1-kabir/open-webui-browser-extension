import browser from 'webextension-polyfill'
import type { Connection, ContextItem, Settings } from '../shared/types'

export async function loadPanelState(): Promise<{
  settings: Settings
  context: ContextItem[]
}> {
  const settings = (await browser.runtime.sendMessage({
    type: 'settings:get'
  })) as Settings
  const context = (await browser.runtime.sendMessage({
    type: 'context:list'
  })) as ContextItem[]
  return { settings, context }
}

type PageResult = {
  title?: string
  url?: string
  text?: string
  selection?: string
  html?: string
  textTruncated?: boolean
  htmlTruncated?: boolean
}

export async function readPageContext(
  mode: 'page' | 'selection' | 'html' = 'page'
): Promise<ContextItem> {
  const result = (await browser.runtime.sendMessage({
    type: 'page:read',
    mode
  })) as PageResult
  if (!result || typeof result !== 'object' || !result.url)
    throw new Error(
      'This page cannot be read. Try selecting text and copying it instead.'
    )
  const text =
    mode === 'selection'
      ? result.selection || ''
      : mode === 'html'
        ? result.html || ''
        : result.text || ''
  if (!text)
    throw new Error(
      mode === 'selection'
        ? 'Select some text on the page first.'
        : 'This page has no readable content.'
    )
  return {
    id: crypto.randomUUID(),
    kind: mode,
    title:
      mode === 'selection'
        ? `Selection from ${result.title || 'current page'}`
        : result.title || 'Current page',
    sourceUrl: result.url,
    text,
    createdAt: Date.now(),
    pinned: false,
    truncated:
      mode === 'html'
        ? Boolean(result.htmlTruncated)
        : Boolean(result.textTruncated)
  }
}

export async function readClipboardContext(): Promise<ContextItem> {
  const result = (await browser.runtime.sendMessage({
    type: 'clipboard:read'
  })) as { text?: string; truncated?: boolean }
  if (!result?.text) throw new Error('The clipboard is empty.')
  return {
    id: crypto.randomUUID(),
    kind: 'clipboard',
    title: 'Clipboard',
    text: result.text,
    createdAt: Date.now(),
    pinned: false,
    truncated: Boolean(result.truncated)
  }
}

export async function readTabsContext(): Promise<ContextItem> {
  const tabs = (await browser.runtime.sendMessage({
    type: 'tabs:read'
  })) as Array<{
    title: string
    url: string
    active: boolean
    pinned: boolean
  }>
  if (!tabs.length) throw new Error('No browser tabs are available.')
  return {
    id: crypto.randomUUID(),
    kind: 'tabs',
    title: `${tabs.length} browser tab${tabs.length === 1 ? '' : 's'}`,
    text: tabs
      .map(
        (tab) =>
          `${tab.active ? '[active] ' : ''}${tab.pinned ? '[pinned] ' : ''}${tab.title}\n${tab.url}`
      )
      .join('\n\n'),
    createdAt: Date.now(),
    pinned: false,
    truncated: false
  }
}

export async function readScreenshotContext(): Promise<ContextItem> {
  const dataUrl = (await browser.runtime.sendMessage({
    type: 'capture:visible'
  })) as string
  return {
    id: crypto.randomUUID(),
    kind: 'screenshot',
    title: 'Visible tab screenshot',
    dataUrl,
    createdAt: Date.now(),
    pinned: false,
    truncated: false
  }
}

export async function stage(item: ContextItem): Promise<ContextItem[]> {
  return browser.runtime.sendMessage({ type: 'context:stage', item })
}

export async function remove(item: ContextItem): Promise<ContextItem[]> {
  return browser.runtime.sendMessage({ type: 'context:remove', id: item.id })
}

export async function pin(
  item: ContextItem,
  pinned: boolean
): Promise<ContextItem[]> {
  return browser.runtime.sendMessage({
    type: 'context:pin',
    id: item.id,
    pinned
  })
}

export async function clearUnpinned(): Promise<ContextItem[]> {
  return browser.runtime.sendMessage({ type: 'context:clear-unpinned' })
}

export async function clearAll(): Promise<ContextItem[]> {
  return browser.runtime.sendMessage({ type: 'context:clear' })
}

export async function setDefault(connection: Connection): Promise<Settings> {
  return browser.runtime.sendMessage({
    type: 'connections:set-default',
    id: connection.id
  })
}
