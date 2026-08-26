import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const targets = {
  chromium: { sidePanel: true, sidebar: false },
  firefox: { sidePanel: false, sidebar: true }
}
const requiredFiles = [
  'background.js',
  'content.js',
  'fallback.js',
  'settings.js',
  'sidepanel.js',
  'sidebar.js',
  'src/fallback-tab/index.html',
  'src/settings/index.html',
  'src/sidepanel/index.html',
  'src/sidebar/index.html'
]

for (const [target, expected] of Object.entries(targets)) {
  const root = join('dist', target)
  const manifestPath = join(root, 'manifest.json')
  if (!existsSync(manifestPath))
    throw new Error(`${target}: missing manifest.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.manifest_version !== 3)
    throw new Error(`${target}: manifest version must be 3`)
  if (
    !Array.isArray(manifest.permissions) ||
    !manifest.permissions.includes('storage')
  )
    throw new Error(`${target}: storage permission is required`)
  if (manifest.host_permissions?.length)
    throw new Error(`${target}: unexpected host permissions`)
  if (Boolean(manifest.side_panel) !== expected.sidePanel)
    throw new Error(`${target}: side panel manifest mismatch`)
  if (Boolean(manifest.sidebar_action) !== expected.sidebar)
    throw new Error(`${target}: sidebar manifest mismatch`)
  for (const file of requiredFiles) {
    if (!existsSync(join(root, file)))
      throw new Error(`${target}: missing ${file}`)
  }
  if (
    manifest.background?.service_worker !== 'background.js' &&
    target === 'chromium'
  )
    throw new Error('chromium: invalid service worker')
  if (!Array.isArray(manifest.background?.scripts) || target !== 'firefox')
    if (target === 'firefox')
      throw new Error('firefox: invalid background scripts')
}

console.log('Build artifacts and manifests are valid.')
