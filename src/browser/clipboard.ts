import { assertContextText } from '../shared/validation'
import { LIMITS } from '../shared/limits'

export async function readClipboardText(): Promise<{
  text: string
  truncated: boolean
}> {
  if (!navigator.clipboard?.readText)
    throw new Error('Clipboard text is not available in this browser.')
  return assertContextText(
    await navigator.clipboard.readText(),
    LIMITS.clipboard
  )
}
