import browser from 'webextension-polyfill'
import { assertContextText } from '../shared/validation'
import { LIMITS } from '../shared/limits'
browser.runtime.onMessage.addListener((message: any) => {
  if (message?.type !== 'page:read') return undefined
  const selection = window.getSelection()?.toString() ?? ''
  return Promise.resolve({
    title: document.title,
    url: location.href,
    selection: assertContextText(selection, LIMITS.pageText),
    text: assertContextText(document.body?.innerText ?? '', LIMITS.pageText),
    html: assertContextText(
      document.documentElement?.outerHTML ?? '',
      LIMITS.html
    )
  })
})
