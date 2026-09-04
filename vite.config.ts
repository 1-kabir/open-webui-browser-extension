import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

const manifest = (mode: string) => ({
  manifest_version: 3,
  name: 'Open WebUI Browser Extension',
  version: '0.1.0',
  description: 'Connect to Open WebUI and add browser context to your chats.',
  permissions: ['storage', ...(mode === 'chromium' ? ['sidePanel'] : [])],
  optional_permissions: ['tabs', 'activeTab', 'scripting', 'clipboardRead'],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['content.js'],
      run_at: 'document_start',
      all_frames: false
    }
  ],
  action: { default_title: 'Open WebUI' },
  background:
    mode === 'firefox'
      ? { scripts: ['background.js'] }
      : { service_worker: 'background.js', type: 'module' },
  options_ui: { page: 'src/settings/index.html', open_in_tab: true },
  ...(mode === 'chromium'
    ? { side_panel: { default_path: 'src/sidepanel/index.html' } }
    : {}),
  sidebar_action:
    mode === 'firefox'
      ? {
          default_title: 'Open WebUI',
          default_panel: 'src/sidebar/index.html',
          open_at_install: false
        }
      : undefined,
  browser_specific_settings:
    mode === 'firefox'
      ? {
          gecko: {
            id: 'open-webui-browser-extension@1-kabir.github.io',
            strict_min_version: '109.0'
          }
        }
      : undefined
})

export default defineConfig(({ mode }) => ({
  // Vitest reads this config too; browser smoke specs belong to Playwright.
  test: {
    exclude: ['node_modules/**', 'dist/**', 'tests/browser/**']
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      'svelte/internal/client': resolve(
        'node_modules/svelte/src/internal/client/index.js'
      ),
      'svelte/internal/disclose-version': resolve(
        'node_modules/svelte/src/internal/disclose-version.js'
      ),
      'svelte/internal/flags/legacy': resolve(
        'node_modules/svelte/src/internal/flags/legacy.js'
      ),
      svelte: resolve('node_modules/svelte/src/index-client.js')
    }
  },
  plugins: [
    svelte(),
    {
      name: 'manifest',
      closeBundle() {
        const dir = resolve(`dist/${mode}`)
        mkdirSync(dir, { recursive: true })
        writeFileSync(
          resolve(dir, 'manifest.json'),
          JSON.stringify(manifest(mode), null, 2)
        )
      }
    }
  ],
  build: {
    outDir: `dist/${mode}`,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve('src/background/service-worker.ts'),
        content: resolve('src/content/content.ts'),
        sidepanel: resolve('src/sidepanel/index.html'),
        sidebar: resolve('src/sidebar/index.html'),
        fallback: resolve('src/fallback-tab/index.html'),
        settings: resolve('src/settings/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
}))
