# Open WebUI Browser Extension Project Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the extension's production-ready MVP without modifying Open WebUI, while providing an optional versioned integration path for future composer support.

**Architecture:** Keep the extension authoritative for permissions, browser access, context staging, and privacy. Add focused connection and protocol modules, use an explicit text-context insertion request only when a compatible Open WebUI page opts in, and retain the extension-owned tray plus manual export as the universal fallback. Screenshots and HTML remain local unless a future attachment capability is explicitly negotiated.

**Tech Stack:** TypeScript, Svelte 5, Vite, Manifest V3, webextension-polyfill, Vitest, optional Playwright smoke tests.

**Spec:** `docs/superpowers/specs/2026-08-26-open-webui-browser-extension-design.md` when present; existing behavioral contract is also defined by `docs/implementation-plan.md`, `docs/integration-protocol.md`, and `docs/privacy-and-permissions.md`.

## Global Constraints

- Do not modify the sibling `open-webui/` repository.
- Do not read, store, transmit, or proxy tokens, cookies, passwords, or credentials.
- Browser context is collected only after an explicit user action.
- No automatic message submission; the user must confirm sending in Open WebUI.
- Do not request broad host permissions at installation time.
- Screenshots and raw HTML are not transmitted without an explicit negotiated attachment contract.
- Preserve Chromium and Firefox builds from the shared source tree.
- Every behavior change gets a failing test before production code.
- Run formatting, lint, typecheck, unit tests, builds, and diff checks before completion.

### Task 1: Establish focused routing and error boundaries

**Files:**
- Create: `src/background/message-router.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/shared/message-validation.ts`
- Test: `tests/unit/message-router.test.ts`

**Interfaces:**
- `routeMessage(message: unknown, sender: browser.Runtime.MessageSender): Promise<unknown>` validates sender and dispatches only known extension messages.
- Bridge requests from configured top-level Open WebUI origins remain allowlisted.
- Errors returned to UI and pages use stable, display-safe messages.

- [ ] **Step 1: Write failing tests** for unknown-message handling, invalid bridge sender rejection, configured-origin enforcement, and safe error responses.
- [ ] **Step 2: Run `npm test -- tests/unit/message-router.test.ts` and verify the tests fail for the missing router behavior.
- [ ] **Step 3: Extract the existing service-worker switch into the router without changing supported message names or permission semantics.
- [ ] **Step 4: Run the focused tests, then the complete unit suite.
- [ ] **Step 5: Commit `refactor: isolate extension message routing`.

### Task 2: Add editable connections and explicit reachability testing

**Files:**
- Modify: `src/background/connection-manager.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/settings/Settings.svelte`
- Modify: `src/ui/PanelApp.svelte`
- Modify: `src/shared/validation.ts`
- Test: `tests/unit/connection-manager.test.ts`

**Interfaces:**
- `updateConnection(id: string, input: ConnectionInput): Promise<Settings>` preserves the connection ID and validates all fields.
- `validateConnectionReachability(url: string): Promise<{ ok: boolean; status?: number; error?: string }>` contacts only the exact configured origin, with a bounded timeout and no credentials or context.

- [ ] **Step 1: Write failing tests** for editing, default-connection preservation, malformed updates, timeout handling, redirects, and network failure.
- [ ] **Step 2: Run the focused tests and verify expected failures.
- [ ] **Step 3: Implement edit controls and a user-triggered “Test connection” action. Use `fetch` with a short timeout, `redirect: 'manual'`, and no request body; never log the URL or response body.
- [ ] **Step 4: Run focused and complete tests.
- [ ] **Step 5: Commit `feat: add editable connections and bounded connection checks`.

### Task 3: Improve context export, persistence policy, and destructive-action UX

**Files:**
- Modify: `src/background/context-manager.ts`
- Modify: `src/ui/ContextTray.svelte`
- Modify: `src/ui/PanelApp.svelte`
- Modify: `src/ui/panel.ts`
- Modify: `docs/privacy-and-permissions.md`
- Test: `tests/unit/context.test.ts`

**Interfaces:**
- Context remains memory-only by default.
- Export never includes screenshot data URLs in text output.
- Successful export clears only unpinned items.
- Clear-all requires an explicit confirmation step.

- [ ] **Step 1: Write failing tests** for export formatting, pinned retention, clear-all confirmation state, and service-worker restart behavior documentation.
- [ ] **Step 2: Run the focused tests and verify expected failures.
- [ ] **Step 3: Implement the smallest UX and documentation changes; do not add sensitive persistence.
- [ ] **Step 4: Run focused and complete tests.
- [ ] **Step 5: Commit `feat: clarify context retention and export behavior`.

### Task 4: Add optional text-context composer negotiation

**Files:**
- Modify: `src/integration/protocol.ts`
- Modify: `src/integration/capability-negotiation.ts`
- Modify: `src/content/open-webui-bridge.ts`
- Modify: `src/content/content.ts`
- Modify: `src/ui/ContextTray.svelte`
- Modify: `src/ui/PanelApp.svelte`
- Modify: `docs/integration-protocol.md`
- Test: `tests/unit/protocol.test.ts`
- Test: `tests/unit/open-webui-bridge.test.ts`

**Interfaces:**
- Add an optional capability such as `contextTextInsert: boolean`.
- Add a user-triggered request/event for text context insertion, carrying only bounded plain text and item metadata.
- The page acknowledges insertion; the extension never requests submission.
- Unsupported pages continue using Copy context and the extension tray.

- [ ] **Step 1: Write failing protocol and bridge tests** for capability negotiation, bounded text insertion, origin/nonce validation, rejection of image data URLs, and no auto-submit behavior.
- [ ] **Step 2: Run focused tests and verify expected failures.
- [ ] **Step 3: Implement the optional contract and a panel button that appears only after capability acknowledgement.
- [ ] **Step 4: Document a host-side implementation example for Open WebUI maintainers without modifying the sibling repository.
- [ ] **Step 5: Run focused and complete tests.
- [ ] **Step 6: Commit `feat: add optional text context insertion contract`.

### Task 5: Add compatibility, installation, troubleshooting, and threat-model documentation

**Files:**
- Create: `docs/compatibility.md`
- Create: `docs/threat-model.md`
- Create: `docs/installation.md`
- Create: `docs/troubleshooting.md`
- Modify: `README.md`
- Modify: `docs/implementation-plan.md`

- [ ] **Step 1: Write documentation covering Chromium/Firefox surfaces, permission differences, restricted pages, iframe fallback, memory-only context, and unsupported attachment/composer behavior.
- [ ] **Step 2: Check every documented command and path against the repository.
- [ ] **Step 3: Run Prettier on documentation and commit `docs: complete installation and security guidance`.

### Task 6: Add available browser smoke-test infrastructure

**Files:**
- Create: `tests/browser/extension-smoke.spec.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `docs/ci-cd.md`

**Interfaces:**
- `npm run test:browser` builds required artifacts and runs extension smoke tests when configured browsers are available.
- Missing browser binaries produce an explicit skipped/unavailable result, never a false pass.

- [ ] **Step 1: Write the smoke-test harness and manifest/artifact assertions first.
- [ ] **Step 2: Run it in the current environment and record whether Chromium/Firefox are available.
- [ ] **Step 3: Add only the minimum Playwright dependency if the existing lockfile does not already provide it.
- [ ] **Step 4: Run the smoke command and document environmental limitations.
- [ ] **Step 5: Commit `test: add optional browser smoke coverage`.

### Task 7: Accessibility and release hardening

**Files:**
- Modify: `src/ui.css`
- Modify: `src/ui/ContextTray.svelte`
- Modify: `src/ui/PanelApp.svelte`
- Modify: `src/settings/Settings.svelte`
- Modify: `README.md`
- Modify: `docs/ci-cd.md`
- Test: relevant unit tests and build verification

- [ ] **Step 1: Add tests or deterministic checks for keyboard labels, focusable controls, and destructive-action state.
- [ ] **Step 2: Implement focus-visible styles, reduced-motion handling, clearer status announcements, and release metadata.
- [ ] **Step 3: Run the complete validation and both browser builds.
- [ ] **Step 4: Review `git diff --check`, `git status`, generated artifacts, permissions, and sensitive-data patterns.
- [ ] **Step 5: Commit `chore: prepare extension for release`.

## Final verification

Run from `open-webui-browser-extension/`:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser

git diff --check
git status --short --branch
```

Report separately:

- Unit-test count and result.
- Chromium and Firefox build result.
- Browser binaries actually available and tested.
- Any feature that remains dependent on a future Open WebUI upstream hook.
- Exact files and commits produced.

## Self-review

- The plan does not modify `open-webui/`.
- Composer insertion is optional and text-only; no automatic submission or credential access is introduced.
- Screenshot/HTML attachment upload is intentionally excluded until a server-side contract exists.
- All implementation tasks include tests before production changes.
- Browser testing is explicit about unavailable local browsers rather than claiming coverage.
