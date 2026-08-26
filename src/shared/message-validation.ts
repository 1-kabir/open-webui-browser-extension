import type { ContextItem } from './types'
import { LIMITS } from './limits'

const contextKinds = new Set([
  'page',
  'selection',
  'tabs',
  'tab-groups',
  'clipboard',
  'screenshot',
  'html'
])

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isContextItem(value: unknown): value is ContextItem {
  if (!record(value)) return false
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > 128 ||
    typeof value.title !== 'string' ||
    value.title.length > 500 ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.pinned !== 'boolean' ||
    typeof value.truncated !== 'boolean' ||
    typeof value.kind !== 'string' ||
    !contextKinds.has(value.kind)
  )
    return false
  if (value.sourceUrl !== undefined && typeof value.sourceUrl !== 'string')
    return false
  if (
    value.text !== undefined &&
    (typeof value.text !== 'string' || value.text.length > LIMITS.html)
  )
    return false
  if (
    value.dataUrl !== undefined &&
    (typeof value.dataUrl !== 'string' ||
      value.dataUrl.length > LIMITS.screenshotBytes * 2)
  )
    return false
  return value.text !== undefined || value.dataUrl !== undefined
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

export function isTabIds(value: unknown): value is number[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.length <= LIMITS.tabs &&
      value.every((id) => Number.isInteger(id) && id >= 0))
  )
}
