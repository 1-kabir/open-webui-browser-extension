import browser from 'webextension-polyfill'
import type { BrowserKind, CapabilityReport } from '../shared/types'
export function browserKind(): BrowserKind {
  return navigator.userAgent.includes('Firefox')
    ? 'firefox'
    : navigator.userAgent.includes('Chrome')
      ? 'chromium'
      : 'other'
}
export async function capabilities(): Promise<CapabilityReport> {
  const kind = browserKind()
  const api = browser as any
  return {
    browser: kind,
    sidePanel: !!api.sidePanel,
    sidebar: kind === 'firefox' && !!api.sidebarAction,
    tabs: !!browser.tabs,
    tabGroups: !!api.tabs?.group,
    clipboard: !!navigator.clipboard,
    capture: !!browser.tabs.captureVisibleTab,
    fullPageCapture: false
  }
}
export { browser }
