import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

type BrowserName = 'chromium' | 'firefox'

/**
 * Report whether a Playwright-managed browser binary is actually runnable on
 * this machine. A browser directory existing is not enough: the binary can be
 * present but fail to launch because shared libraries are missing. We run the
 * binary with `--version` and treat a non-zero exit as "unavailable".
 *
 * Versioned directories come from `npx playwright install --dry-run` output.
 */
function isBrowserRunnable(name: BrowserName): boolean {
  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    join(process.env.HOME ?? '', '.cache', 'ms-playwright')
  const layout: Record<BrowserName, { prefix: string; relativeBin: string }> = {
    chromium: {
      prefix: 'chromium-',
      relativeBin: join('chrome-linux64', 'chrome')
    },
    firefox: { prefix: 'firefox-', relativeBin: join('firefox', 'firefox') }
  }
  const { prefix, relativeBin } = layout[name]
  if (!existsSync(browsersPath)) return false
  // Resolve the newest installed version directory (e.g. chromium-1234) so a
  // Playwright upgrade does not silently mark a runnable browser unavailable.
  const candidates = readdirSync(browsersPath)
    .filter((entry) => entry.startsWith(prefix))
    .sort()
    .reverse()
  for (const dir of candidates) {
    const binary = join(browsersPath, dir, relativeBin)
    if (!existsSync(binary)) continue
    const probe = spawnSync(binary, ['--version'], { timeout: 15000 })
    if (probe.status === 0) return true
  }
  return false
}

const chromiumAvailable = isBrowserRunnable('chromium')
const firefoxAvailable = isBrowserRunnable('firefox')
const available: string[] = []
if (chromiumAvailable) available.push('chromium')
if (firefoxAvailable) available.push('firefox')

// Playwright fails the whole run if `projects` ends up empty, so when no
// browser can run we keep one project. The spec then reports the
// skipped/unavailable state explicitly instead of silently passing.
const projects = available.length
  ? available.map((name) => ({
      name,
      use: { browserName: name as BrowserName }
    }))
  : [{ name: 'none', use: { browserName: 'chromium' as BrowserName } }]

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /extension-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true
  },
  projects,
  globalSetup: './tests/browser/global-setup.ts'
})

export { chromiumAvailable, firefoxAvailable }
