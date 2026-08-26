import { assertContextText } from '../shared/validation'
import { LIMITS } from '../shared/limits'

export function readCurrentPage() {
  const selection = window.getSelection()?.toString() ?? ''
  return {
    title: document.title,
    url: location.href,
    selection: assertContextText(selection, LIMITS.pageText),
    text: assertContextText(document.body?.innerText ?? '', LIMITS.pageText),
    html: assertContextText(
      document.documentElement?.outerHTML ?? '',
      LIMITS.html
    )
  }
}
