import type { ContextItem } from '../shared/types'

const MAX_ITEMS = 20
let staged: ContextItem[] = []

export function listContext(): ContextItem[] {
  return staged.map((item) => ({ ...item }))
}
export function stageContext(item: ContextItem): ContextItem[] {
  const duplicate = staged.some(
    (existing) =>
      existing.kind === item.kind &&
      existing.text === item.text &&
      existing.dataUrl === item.dataUrl
  )
  if (!duplicate) staged = [...staged, item].slice(-MAX_ITEMS)
  return listContext()
}
export function removeContext(id: string): ContextItem[] {
  staged = staged.filter((item) => item.id !== id)
  return listContext()
}
export function pinContext(id: string, pinned = true): ContextItem[] {
  staged = staged.map((item) =>
    item.id === id ? { ...item, pinned } : item
  )
  return listContext()
}
export function clearContext(): ContextItem[] {
  staged = []
  return []
}
export function setContext(items: ContextItem[]): ContextItem[] {
  staged = items.slice(-MAX_ITEMS)
  return listContext()
}
export function clearUnpinnedContext(): ContextItem[] {
  staged = staged.filter((item) => item.pinned)
  return listContext()
}
