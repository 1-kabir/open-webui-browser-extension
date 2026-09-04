import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox } from '@playwright/test'
import type { FullConfig } from '@playwright/test'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

type BrowserName = 'chromium' | 'firefox'
type BrowserFactories = Record<BrowserName, typeof chromium>

/**
 * Global setup decides, once per run, whether browser smoke coverage can run.
 *
 * - If no installed browser binary can actually launch (missing downloads or
 *   missing shared libraries), setup records an explicit
 *   "unavailable/skipped" outcome that the spec reports, and the run is not
 *   treated as a pass.
 * - If at least one browser runs, setup validates the built extension
 *   artifacts (manifest and required files) so the specs can load them.
 *
 * State is passed to the spec via environment variables because Playwright's
 * worker processes do not share in-memory state with globalSetup.
 */
export default async function globalSetup(
  _config: FullConfig
): Promise<() => void> {
  const browserName =
    (process.env.PLAYWRIGHT_BROWSER_NAME as BrowserName | undefined) ??
    'chromium'
  const factories: BrowserFactories = { chromium, firefox }

  // Prefer the project the config selected; fall back to probing the other
  // browser if the selected one cannot launch (e.g. the "none" project).
  let selected: BrowserName | null = null
  for (const name of [
    browserName,
    browserName === 'chromium' ? 'firefox' : 'chromium'
  ] as BrowserName[]) {
    try {
      await factories[name].launch({ headless: true })
      selected = name
      break
    } catch {
      // binary missing or unusable on this machine
    }
  }

  process.env.SMOKE_BROWSER = selected ?? 'none'
  process.env.SMOKE_UNAVAILABLE = selected ? '' : '1'
  if (!selected) {
    console.warn(
      `[smoke] Browser binaries are unavailable in this environment (probed chromium and firefox). ` +
        `Browser smoke tests will be reported as skipped/unavailable, not passed. ` +
        `Install them with \`npx playwright install chromium firefox\` and ensure required shared libraries are present.`
    )
    return () => {}
  }

  console.log(`[smoke] Using browser: ${selected}`)

  const target = selected === 'firefox' ? 'firefox' : 'chromium'
  const root = join(repoRoot, 'dist', target)
  const manifestPath = join(root, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(
      `dist/${target}/manifest.json not found. Run \`npm run build\` before \`npm run test:browser\`.`
    )
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    manifest_version?: number
    name?: string
    version?: string
    background?: { service_worker?: string; scripts?: string[] }
    content_scripts?: { js?: string[] }[]
  }

  if (manifest.manifest_version !== 3) {
    throw new Error(`dist/${target}/manifest.json: expected manifest_version 3`)
  }
  if (!manifest.name || !manifest.version) {
    throw new Error(`dist/${target}/manifest.json: missing name or version`)
  }
  const entry =
    target === 'firefox'
      ? manifest.background?.scripts?.[0]
      : manifest.background?.service_worker
  if (!entry) {
    throw new Error(
      `dist/${target}/manifest.json: missing background entry point`
    )
  }
  if (!existsSync(join(root, entry))) {
    throw new Error(
      `dist/${target}/${entry} referenced by manifest.json is missing`
    )
  }
  if (!manifest.content_scripts?.[0]?.js?.includes('content.js')) {
    throw new Error(
      `dist/${target}/manifest.json: content script content.js is not registered`
    )
  }
  if (!existsSync(join(root, 'content.js'))) {
    throw new Error(`dist/${target}/content.js is missing`)
  }

  return () => {}
}
