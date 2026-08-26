import { browser } from './platform'
import { LIMITS } from '../shared/limits'

export interface TabContext {
  id: number
  windowId: number
  title: string
  url: string
  active: boolean
  pinned: boolean
  index: number
  groupId?: number
}

export async function readTabs(selectedIds?: number[]): Promise<TabContext[]> {
  const tabs = await browser.tabs.query({})
  const selected = selectedIds ? new Set(selectedIds) : undefined
  return tabs
    .filter(
      (tab) =>
        tab.id != null &&
        tab.windowId != null &&
        (!selected || selected.has(tab.id))
    )
    .slice(0, LIMITS.tabs)
    .map((tab) => ({
      id: tab.id!,
      windowId: tab.windowId!,
      title: tab.title ?? '',
      url: tab.url ?? '',
      active: Boolean(tab.active),
      pinned: Boolean(tab.pinned),
      index: tab.index,
      ...(typeof tab.groupId === 'number' && tab.groupId >= 0
        ? { groupId: tab.groupId }
        : {})
    }))
}
