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

export async function readPageContext(): Promise<ContextItem> {
  const result = (await browser.runtime.sendMessage({ type: 'page:read' })) as {
    title?: string
    url?: string
    text?: string
    selection?: string
    html?: string
  }
  if (!result || typeof result !== 'object' || !result.url) {
    throw new Error(
      'This page cannot be read. Try selecting text and copying it instead.'
    )
  }
  return {
    id: crypto.randomUUID(),
    kind: result.selection ? 'selection' : 'page',
    title: result.title || 'Current page',
    sourceUrl: result.url,
    text: result.selection || result.text || '',
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

export async function setDefault(connection: Connection): Promise<Settings> {
  return browser.runtime.sendMessage({
    type: 'connections:set-default',
    id: connection.id
  })
}
