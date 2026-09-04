# Open WebUI Browser Extension Implementation Plan

## Scope

Build the first production-oriented slice of an unofficial, upstream-friendly browser extension that embeds existing Open WebUI servers and adds explicit browser-context features. The extension will not install or run Open WebUI locally. It will support Chromium-family browsers and Firefox from the first release, using native sidebars where available and an extension-tab fallback elsewhere.

## Technology decisions

- TypeScript for application, background, content-script, and adapter code.
- Svelte for the extension-owned side panel, Firefox sidebar, fallback tab, settings, connection manager, and context tray.
- Vite-based multi-entry build with generated Chromium and Firefox manifests.
- `webextension-polyfill` for a Promise-based browser API surface, wrapped by local capability adapters.
- Manifest V3 for Chromium builds and a Firefox-compatible manifest target, preserving a single shared source tree.
- Vitest for unit tests and Playwright for browser integration tests where the local environment supports extension loading.
- No server-side dependency and no telemetry.

The exact package versions should be selected at scaffold time from current stable releases and recorded in the lockfile. Avoid adding a framework or library that duplicates existing browser APIs.

## Repository structure

```text
open-webui-browser-extension/
├── docs/
│   ├── implementation-plan.md
│   ├── integration-protocol.md
│   ├── privacy-and-permissions.md
│   ├── compatibility.md
│   ├── installation.md
│   ├── troubleshooting.md
│   └── threat-model.md
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── connection-manager.ts
│   │   ├── context-manager.ts
│   │   ├── message-router.ts
│   │   └── permission-manager.ts
│   ├── browser/
│   │   ├── platform.ts
│   │   ├── chromium.ts
│   │   ├── firefox.ts
│   │   ├── tabs.ts
│   │   ├── tab-groups.ts
│   │   ├── clipboard.ts
│   │   └── capture.ts
│   ├── content/
│   │   ├── page-reader.ts
│   │   ├── open-webui-bridge.ts
│   │   └── composer-integration.ts
│   ├── integration/
│   │   ├── protocol.ts
│   │   ├── capability-negotiation.ts
│   │   └── context-payload.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── limits.ts
│   │   ├── redaction.ts
│   │   └── validation.ts
│   ├── sidepanel/
│   │   ├── App.svelte
│   │   ├── main.ts
│   │   └── components/
│   ├── sidebar/
│   │   ├── App.svelte
│   │   └── main.ts
│   ├── fallback-tab/
│   │   ├── App.svelte
│   │   └── main.ts
│   └── settings/
│       ├── App.svelte
│       └── main.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── manifests/
│   ├── chromium.json
│   └── firefox.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The build may combine `sidepanel` and `sidebar` into one Svelte entry if the browser APIs require no UI difference. The source boundary must remain explicit even when the rendered components are shared.

## Phase 1: Scaffold and browser shell

### Deliverables

- Initialize the repository with package metadata, license, README, formatter, linter, type checker, test runner, and build commands.
- Add generated Chromium and Firefox manifests with only the minimum startup permissions.
- Add a background service worker and runtime message router.
- Add the shared `BrowserPlatform` interface and Chromium/Firefox implementations.
- Add side-panel, Firefox-sidebar, fallback-tab, and settings entry points using shared Svelte components.
- Add a capability report visible in diagnostics/settings.
- Add a local development guide for loading unpacked builds in Chromium and Firefox.

### Acceptance checks

- Chromium can load the unpacked extension and open its side panel.
- Firefox can load the unpacked extension and open its sidebar.
- A browser without a native panel implementation can open the fallback tab.
- All entry points share types and pass type checking.
- No broad host permission is required during installation.

## Phase 2: Connections and embedded Open WebUI

### Deliverables

- Implement connection records with stable IDs, display names, URL normalization, default selection, validation, add/update/remove, and local persistence.
- Support remote HTTPS servers and explicit localhost URLs.
- Validate only user-supplied destinations with bounded requests; do not scan the local network.
- Add connection switching in the panel/sidebar.
- Load the selected Open WebUI URL directly in the supported embedded surface.
- Detect blocked embedding, navigation failures, authentication failures, and unreachable servers.
- Add an “Open in browser tab” fallback that preserves the connection.
- Keep login/session state governed by browser-origin security; never copy passwords or tokens into extension storage.
- Add theme and navigation integration support when the bridge is available.

### Acceptance checks

- A user can add a configured Open WebUI server and connect to it.
- A user can add a localhost Open WebUI server.
- Multiple connections can be switched without corrupting metadata or login state.
- A server that disallows embedding gets a clear fallback instead of a blank panel.
- Invalid, unreachable, and malformed URLs produce actionable errors.
- Connection tests cover persistence, default selection, normalization, and removal.

## Phase 3: Browser-neutral Open WebUI integration protocol

### Deliverables

- Define a versioned protocol with request IDs, source/origin validation, connection IDs, bounded payloads, and safe handling of unknown message types.
- Implement page-to-extension communication using a narrowly scoped content-script bridge and `postMessage`/runtime messaging.
- Implement extension-to-page event delivery for capability reports, staged-context updates, theme changes, navigation, and connection status.
- Add capability negotiation so Open WebUI can detect supported features without assuming Electron.
- Add Open WebUI version/bridge detection and a compatibility diagnostic.
- Keep a stable extension-owned toolbar/tray as the fallback when composer injection is unavailable.

### Open WebUI coordination

Before proposing core changes, review the current Open WebUI contribution guidance and open a focused Discussion for a general browser/host integration hook. The extension must remain functional without that hook. Any upstream change should be small, optional, versioned, and useful to other host integrations.

### Acceptance checks

- A test Open WebUI page can complete a request/response round trip.
- Wrong origins, malformed messages, replayed request IDs, oversized payloads, and unknown types are rejected or ignored safely.
- Theme changes are reflected in the extension shell without leaking page contents.
- The bridge exposes no arbitrary extension API to the remote page.

## Phase 4: Context staging and page/clipboard features

### Deliverables

- Create the context item schema with provenance, type, size, preview, one-time/pinned state, and redaction status.
- Implement explicit actions for current page, selected text, raw HTML, and clipboard text.
- Add size limits, truncation behavior, duplicate detection, and user-visible previews.
- Request `activeTab`, scripting, and clipboard permissions only when the relevant action is activated.
- Exclude passwords, hidden inputs, payment fields, and form values by default.
- Keep collection local until message submission.
- Add context removal, clear-all, pin, and post-submit clearing behavior.
- Build the extension-owned context tray and optional composer buttons.

### Acceptance checks

- Context is staged only after an explicit user action.
- The user can inspect and remove every staged item.
- No staged context is sent before the user submits a message.
- Page text and selected text work on supported pages and provide a fallback on restricted pages.
- Raw HTML requires a separate explicit action and is size-bounded.
- Clipboard access is never performed automatically.
- Unit tests cover limits, redaction, deduplication, provenance, and clearing.

## Phase 5: Tabs, windows, groups, and capture

### Deliverables

- Implement normalized tab and window metadata collection.
- Implement Chromium tab-group collection and a Firefox-compatible fallback using available window/tab metadata.
- Add selected-tab and all-tabs context selection with a configurable maximum count.
- Implement user-initiated visible-tab capture.
- Implement full-page capture where the current browser API supports it.
- Add text/page-source fallback when vision input is disabled or capture is unavailable.
- Add capture previews, image size limits, and explicit permission explanations.
- Avoid collecting inactive tab page contents unless the user explicitly selects that option.

### Acceptance checks

- “Read my tabs” exposes titles, URLs, windows, pinned state, and active state.
- “Read tab groups” uses native group data on Chromium and a documented fallback on Firefox.
- Screenshot capture never occurs without an explicit user gesture.
- Capture failure results in an actionable fallback rather than silent loss.
- Sensitive URLs and captured data are not written to logs.
- Browser integration tests cover Chromium and Firefox where available.

## Phase 6: Product hardening and upstream handoff

### Deliverables

- Finish settings for connections, permissions, context behavior, supported capabilities, and privacy.
- Add accessible keyboard flows, focus management, screen-reader names, contrast checks, and reduced-motion behavior.
- Add browser-specific packaging and release documentation.
- Add compatibility documentation for Open WebUI versions and supported browser versions.
- Add a security model and threat model to the documentation.
- Review dependencies for licensing, maintenance, and avoidable lock-in.
- Run formatter, linter, type checks, unit tests, builds, and browser tests.
- Review the final diff for secrets, broad permissions, captured data, generated artifacts, and accidental modifications.
- Prepare an upstream Discussion proposal and integration-contract summary.

## Data and security rules

- The service worker is the authority for browser capability requests and staged context.
- Remote Open WebUI pages receive only the protocol messages they need.
- Never use `innerHTML` with untrusted page content in extension UI; render escaped text or sanitized markup.
- Never log tokens, cookies, clipboard contents, page source, screenshot data, or full URLs containing credentials.
- Keep raw staged content in memory where practical; persist only user preferences and non-sensitive connection metadata.
- Use explicit origin checks for page messages and validate every incoming payload.
- Treat a configured remote Open WebUI server as an external trust boundary.
- Explain that context may be transmitted to that server when the user submits a message.

## Verification commands

At each phase, run the applicable commands from the repository root:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Once browser fixtures exist:

```bash
npm run test:browser
```

The final report must include the exact commands run, browser versions tested, results, and known limitations. No phase is complete based solely on compilation.

## Dependency and compatibility checkpoints

- Confirm the selected WebExtensions wrapper supports both target manifest builds before committing to it.
- Confirm the selected panel APIs and fallback behavior on the minimum Chromium and Firefox versions.
- Confirm embedding behavior with Open WebUI's current response headers and authentication flows.
- Confirm the context payload strategy against Open WebUI's current message/attachment handling before implementing screenshot upload.
- If a browser capability requires an elevated permission or debugger API, pause and document the trade-off before adding it.

## Recommended first implementation order

1. Scaffold and manifests.
2. Panel/sidebar/fallback shell.
3. Connection manager and embedded Open WebUI loading.
4. Protocol and capability negotiation.
5. Context tray with page text and selected text.
6. Clipboard.
7. Tabs and tab groups.
8. Capture and vision/text fallback.
9. Composer integration.
10. Hardening, documentation, and upstream proposal.

## Implementation status

The first production-oriented slice described by this plan is implemented and validated (`npm run validate` and `npm run build` pass in CI and locally). Implemented behavior differs from the original phase list in documented, deliberate ways:

- **Composer integration is optional and event-only.** There is no stable upstream browser hook to build against, so text insertion flows through the extension-to-page `context:insert-text` bridge event, gated on the page's `contextTextInsert` capability. The extension never auto-submits, and there is no attachment or screenshot-upload contract. When insertion is unavailable, copying formatted context and pasting is the universal fallback.
- **Context is memory-only.** Staged context is never persisted; it is lost when the background service worker restarts. Pinned items survive clear-unpinned and post-export clearing but not restarts.
- **Capture is visible-tab only.** `fullPageCapture` is always `false` in the capability report; screenshots are bounded at 8 MiB and excluded from text export.
- **Tab groups on Firefox** use a documented window-based fallback rather than the native Chromium group API.

User-facing behavior, browser support, permissions, restricted pages, and installation steps are documented in [compatibility.md](compatibility.md), [installation.md](installation.md), [troubleshooting.md](troubleshooting.md), and [threat-model.md](threat-model.md). Browser automation smoke tests are planned as a follow-up; the current quality gate is the unit suite plus the build's manifest verification.
