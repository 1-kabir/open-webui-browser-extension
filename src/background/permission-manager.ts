import { browser } from '../browser/platform'

export type ActionPermission =
  'tabs' | 'activeTab' | 'scripting' | 'clipboardRead'
export type PermissionState = Record<ActionPermission, boolean>

const permissions: ActionPermission[] = [
  'tabs',
  'activeTab',
  'scripting',
  'clipboardRead'
]

export async function hasPermission(
  permission: ActionPermission
): Promise<boolean> {
  try {
    return await browser.permissions.contains({ permissions: [permission] })
  } catch {
    return false
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  const entries = await Promise.all(
    permissions.map(
      async (permission) =>
        [permission, await hasPermission(permission)] as const
    )
  )
  return Object.fromEntries(entries) as PermissionState
}

/** Must be called directly from a user-initiated action when the browser requires a gesture. */
export async function requestPermission(
  permission: ActionPermission
): Promise<boolean> {
  if (await hasPermission(permission)) return true
  try {
    return await browser.permissions.request({ permissions: [permission] })
  } catch {
    return false
  }
}

export async function removePermission(
  permission: ActionPermission
): Promise<boolean> {
  try {
    return await browser.permissions.remove({ permissions: [permission] })
  } catch {
    return false
  }
}
