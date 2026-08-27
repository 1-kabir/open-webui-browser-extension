import type { ContextItem } from './types'

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
