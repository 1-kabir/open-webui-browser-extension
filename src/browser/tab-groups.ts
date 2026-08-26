import { browser } from './platform'
import { LIMITS } from '../shared/limits'
import type { TabContext } from './tabs'

export interface TabGroupContext {
  id: number | string
  title: string
  color?: string
  collapsed?: boolean
  windowId?: number
  tabIds: number[]
  native: boolean
}

export async function readTabGroups(
  tabs?: TabContext[]
): Promise<TabGroupContext[]> {
  const source = tabs ?? (await import('./tabs')).readTabs()
  const normalizedTabs = await source
  const api = browser as any
  if (typeof api.tabGroups?.query === 'function') {
    const groups = await api.tabGroups.query({})
    return groups.slice(0, LIMITS.groups).map((group: any) => ({
      id: group.id,
      title: group.title ?? '',
      color: group.color,
      collapsed: Boolean(group.collapsed),
      windowId: group.windowId,
      tabIds: normalizedTabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => tab.id),
      native: true
    }))
  }
  const byWindow = new Map<number, number[]>()
  for (const tab of normalizedTabs)
    if (tab.groupId != null)
      byWindow.set(tab.windowId, [
        ...(byWindow.get(tab.windowId) ?? []),
        tab.id
      ])
  return [...byWindow.entries()]
    .slice(0, LIMITS.groups)
    .map(([windowId, tabIds]) => ({
      id: `window:${windowId}`,
      title: `Window ${windowId}`,
      windowId,
      tabIds,
      native: false
    }))
}
