import { existsSync, readFileSync } from 'node:fs'
import { join, normalize } from 'node:path'

const targets = {
  chromium: { sidePanel: true, sidebar: false },
  firefox: { sidePanel: false, sidebar: true }
}

function assertFile(root, file, target) {
  if (typeof file !== 'string' || file.startsWith('/') || file.includes('..'))
    throw new Error(`${target}: invalid manifest reference ${String(file)}`)
  if (!existsSync(join(root, normalize(file))))
    throw new Error(`${target}: missing referenced file ${file}`)
}

function assertManifestReferences(root, manifest, target) {
  const references = [
    manifest.background?.service_worker,
    ...(manifest.background?.scripts ?? []),
    ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? []),
    ...(manifest.content_scripts ?? []).flatMap((script) => script.css ?? []),
    manifest.options_ui?.page,
    manifest.side_panel?.default_path,
    manifest.sidebar_action?.default_panel,
    manifest.action?.default_popup
  ].filter(Boolean)
  for (const reference of references) assertFile(root, reference, target)
}

for (const [target, expected] of Object.entries(targets)) {
  const root = join('dist', target)
  const manifestPath = join(root, 'manifest.json')
  if (!existsSync(manifestPath))
    throw new Error(`${target}: missing manifest.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.manifest_version !== 3)
    throw new Error(`${target}: manifest version must be 3`)
  const packageVersion = JSON.parse(
    readFileSync('package.json', 'utf8')
  ).version
  if (manifest.version !== packageVersion)
    throw new Error(
      `${target}: manifest version ${manifest.version} does not match package.json ${packageVersion}`
    )
  if (
    !Array.isArray(manifest.permissions) ||
    !manifest.permissions.includes('storage')
  )
    throw new Error(`${target}: storage permission is required`)
  if (
    manifest.permissions.some((permission) =>
      ['<all_urls>', 'history', 'bookmarks'].includes(permission)
    )
  )
    throw new Error(`${target}: broad or unrelated permission is not allowed`)
  if (manifest.host_permissions?.length)
    throw new Error(`${target}: unexpected host permissions`)
  if (!manifest.content_scripts?.[0]?.js?.includes('content.js'))
    throw new Error(`${target}: content script is not registered`)
  if (Boolean(manifest.side_panel) !== expected.sidePanel)
    throw new Error(`${target}: side panel manifest mismatch`)
  if (Boolean(manifest.sidebar_action) !== expected.sidebar)
    throw new Error(`${target}: sidebar manifest mismatch`)
  if (
    target === 'chromium' &&
    manifest.background?.service_worker !== 'background.js'
  )
    throw new Error('chromium: invalid service worker')
  if (
    target === 'firefox' &&
    (!Array.isArray(manifest.background?.scripts) ||
      manifest.background.scripts.length !== 1 ||
      manifest.background.scripts[0] !== 'background.js')
  )
    throw new Error('firefox: invalid background scripts')
  assertManifestReferences(root, manifest, target)
}

console.log('Build artifacts and manifest references are valid.')
