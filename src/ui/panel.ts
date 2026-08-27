import browser from 'webextension-polyfill'
import type { Connection, ContextItem, Settings } from '../shared/types'
import { formatContext } from '../shared/context-format'

export { formatContext }

export async function request<T>(message: Record<string, unknown>): Promise<T> {
  const result = (await browser.runtime.sendMessage(message)) as
    T | { error?: string }
  if (result && typeof result === 'object' && 'error' in result && result.error)
    throw new Error(result.error)
  return result as T
}

export async function loadPanelState(): Promise<{
  settings: Settings
  context: ContextItem[]
}> {
  const [settings, context] = await Promise.all([
    request<Settings>({ type: 'settings:get' }),
    request<ContextItem[]>({ type: 'context:list' })
  ])
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
  const result = await request<PageResult>({ type: 'page:read', mode })
  if (!result || !result.url)
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
  const result = await request<{ text?: string; truncated?: boolean }>({
    type: 'clipboard:read'
  })
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
  const tabs = await request<
    Array<{ title: string; url: string; active: boolean; pinned: boolean }>
  >({ type: 'tabs:read' })
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

export async function readTabGroupsContext(): Promise<ContextItem> {
  const groups = await request<
    Array<{
      title: string
      tabIds: number[]
      native: boolean
      windowId?: number
    }>
  >({ type: 'tab-groups:read' })
  if (!groups.length) throw new Error('No tab groups are available.')
  return {
    id: crypto.randomUUID(),
    kind: 'tab-groups',
    title: `${groups.length} tab group${groups.length === 1 ? '' : 's'}`,
    text: groups
      .map(
        (group) =>
          `${group.title || 'Untitled group'} (${group.native ? 'native' : 'window fallback'}${group.windowId == null ? '' : `, window ${group.windowId}`})\nTab IDs: ${group.tabIds.join(', ') || 'none'}`
      )
      .join('\n\n'),
    createdAt: Date.now(),
    pinned: false,
    truncated: false
  }
}

export async function readScreenshotContext(): Promise<ContextItem> {
  const dataUrl = await request<string>({ type: 'capture:visible' })
  if (!dataUrl) throw new Error('The visible tab could not be captured.')
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

export async function exportContext(items: ContextItem[]): Promise<void> {
  if (!items.length) throw new Error('There is no staged context to export.')
  const text = formatContext(items)
  if (!navigator.clipboard?.writeText)
    throw new Error('Copying is not available in this browser.')
  await navigator.clipboard.writeText(text)
}

export async function exportAndClearContext(
  items: ContextItem[],
  clearUnpinnedItems: () => Promise<ContextItem[]>
): Promise<ContextItem[]> {
  const remaining = await clearUnpinnedItems()
  await exportContext(items)
  return remaining
}

export function stage(item: ContextItem) {
  return request<ContextItem[]>({ type: 'context:stage', item })
}
export function remove(item: ContextItem) {
  return request<ContextItem[]>({ type: 'context:remove', id: item.id })
}
export function pin(item: ContextItem, pinned: boolean) {
  return request<ContextItem[]>({ type: 'context:pin', id: item.id, pinned })
}
export function clearUnpinned() {
  return request<ContextItem[]>({ type: 'context:clear-unpinned' })
}
export function clearAll() {
  return request<ContextItem[]>({ type: 'context:clear' })
}
export function setDefault(connection: Connection) {
  return request<Settings>({
    type: 'connections:set-default',
    id: connection.id
  })
}
