# Open WebUI Browser Extension

A privacy-first cross-browser extension for connecting to existing Open WebUI servers and staging browser context for chat. It supports Chromium-family browsers (Chromium 114+ for the native side panel) and Firefox 109+, with native side-panel/sidebar entry points and an extension-tab fallback.

The extension is an independent, community project for the Open WebUI ecosystem. It connects to servers you already run; it does not install or launch Open WebUI.

## Features

- Connect to one or more Open WebUI servers (remote HTTPS or localhost), embedded in a side panel (Chromium), sidebar (Firefox), or extension-tab fallback, with "Open in browser tab" when embedding is blocked.
- Explicit, click-only context staging: current page text, selection, raw HTML, clipboard text, open tabs, tab groups (native on Chromium, window fallback on Firefox), and visible-tab screenshots.
- Bounded payloads with visible previews, pinning, per-item removal, clear-all confirmation, and text export to the clipboard.
- Connection testing from both the panel and the settings page, with reachable/unreachable feedback for each configured server.
- Optional, capability-gated text insertion into the Open WebUI composer via the versioned page-bridge contract. The extension never submits messages automatically, never uploads screenshots or attachments, and never reads credentials.
- Memory-only context: staged content is never written to disk and is lost when the background worker restarts. Only connection metadata and preferences persist.
- Keyboard-accessible controls with visible focus indicators, `prefers-reduced-motion` support, and live-region status/error announcements.
- Deterministic unit test suite, optional Playwright browser smoke checks, and a manifest-verifying build for both Chromium and Firefox targets.

## Development

```bash
npm install
npm run validate
npm run build
```

`npm run validate` runs the formatting check, ESLint, TypeScript, and the unit tests. The same quality gate runs in GitHub Actions for pull requests and pushes to `main`. See [docs/ci-cd.md](docs/ci-cd.md) for release and security workflow details.

`npm run build` produces two loadable targets, verified by the build's manifest checks:

- `dist/chromium` — Manifest V3 build with the Chromium side panel.
- `dist/firefox` — Manifest V3 build with the Firefox sidebar.

Load `dist/chromium` as an unpacked extension in a Chromium browser (`chrome://extensions` → Developer mode → Load unpacked) or load `dist/firefox/manifest.json` temporarily in Firefox (`about:debugging#/runtime/this-firefox` → Load Temporary Add-on). Step-by-step instructions are in [docs/installation.md](docs/installation.md).

## Documentation

- [Installation](docs/installation.md) — build, install, and first-run setup for both browsers.
- [Compatibility](docs/compatibility.md) — supported browser versions and surfaces, permission differences, restricted pages, iframe fallback, memory-only context, and known limitations.
- [Troubleshooting](docs/troubleshooting.md) — common problems and their actual behavior.
- [Privacy, Permissions, and Security](docs/privacy-and-permissions.md) — data flow, permission table, trust boundaries, and retention.
- [Threat model](docs/threat-model.md) — assets, actors, mitigations, and residual risks.
- [Integration protocol](docs/integration-protocol.md) — the versioned page-bridge contract.
- [CI/CD](docs/ci-cd.md) — quality gates, releases, and dependency policy.
- [Implementation plan](docs/implementation-plan.md) — architecture and phased scope.

## Privacy

Browser context is collected only after an explicit user action. Staged context (page text, selections, HTML, clipboard, tabs, screenshots) stays in memory in the extension, is never written to persistent storage, and is never transmitted automatically. Connection metadata and preferences are the only persisted data. The extension does not read cookies, tokens, or passwords; does not submit chat messages for you; and includes no telemetry. Do not add telemetry, secret logging, automatic clipboard reads, or background page capture. See [docs/threat-model.md](docs/threat-model.md) for the full security model.
