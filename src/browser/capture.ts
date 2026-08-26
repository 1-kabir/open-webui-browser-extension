import { browser } from './platform'
import { LIMITS } from '../shared/limits'

export async function captureVisibleTab(windowId?: number): Promise<string> {
  const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
    format: 'png'
  })
  const estimatedBytes = Math.ceil((dataUrl.length * 3) / 4)
  if (estimatedBytes > LIMITS.screenshotBytes)
    throw new Error('The screenshot is too large to stage.')
  return dataUrl
}
