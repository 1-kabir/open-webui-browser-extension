import { browser } from '../browser/platform'

export type ActionPermission = 'activeTab' | 'scripting' | 'clipboardRead'

const permissionOrigins: Partial<Record<ActionPermission, string[]>> = {}

export async function hasPermission(
  permission: ActionPermission
): Promise<boolean> {
  return browser.permissions.contains({ permissions: [permission] })
}

export async function requestPermission(
  permission: ActionPermission
): Promise<boolean> {
  if (await hasPermission(permission)) return true
  return browser.permissions.request({
    permissions: [permission],
    origins: permissionOrigins[permission]
  })
}
