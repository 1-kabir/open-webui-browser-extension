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
  if (!duplicate) {
    const next = [...staged, item]
    while (next.length > MAX_ITEMS) {
      const evictIndex = next.findIndex((entry) => !entry.pinned)
      // If every item is pinned, the limit still wins; evict the oldest pinned
      // item rather than allowing unbounded memory growth from restored state.
      next.splice(evictIndex < 0 ? 0 : evictIndex, 1)
    }
    staged = next
  }
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
  staged = []
  for (const item of items) stageContext(item)
  return listContext()
}
export function clearUnpinnedContext(): ContextItem[] {
  staged = staged.filter((item) => item.pinned)
  return listContext()
}

export function formatContext(items: ContextItem[]): string {
  return items
    .map((item) => {
      const source = item.sourceUrl ? `\nSource: ${item.sourceUrl}` : ''
      const body = item.dataUrl
        ? `[${item.title}]\nA screenshot is staged locally and is not included in this text export.`
        : (item.text ?? '')
      return `## ${item.title} (${item.kind})${source}\n\n${body}`
    })
    .join('\n\n---\n\n')
}
