# Production Context UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a shared, permission-aware context tray for the sidepanel and Firefox sidebar with explicit actions for page, selection, HTML, clipboard, tabs, tab groups, and visible screenshots, plus previews and safe pinned/clear controls.

**Architecture:** Keep collection in the existing background context services and browser adapters. Add a single shared Svelte panel component and a focused context-tray component consumed by both entry points; centralize runtime request/error normalization in the panel service. Do not change the bridge protocol or CI configuration.

**Tech Stack:** Svelte 5, TypeScript, webextension-polyfill, Vitest, Vite.

**Spec:** User request: “Implement production context UX/features: shared context tray actions for page/selection, clipboard, tabs, tab groups, visible screenshot; wire them to background context services with permission-aware errors, previews, limits, and pinned/clear behavior. Refactor duplicated sidepanel/sidebar UI into shared components where practical. Work in src/ui/, src/sidepanel/, src/sidebar/, src/settings/ and related shared files; do not modify CI or bridge protocol implementation. Run tests/typecheck/build and commit changes.”

## Global Constraints

- Browser context is collected only after an explicit user action.
- Never add automatic clipboard reads, automatic screenshots, token handling, telemetry, or secret logging.
- Preserve existing browser adapters and context manager; do not modify bridge protocol implementation or CI.
- Surface permission-aware errors without exposing implementation details.
- Enforce existing limits and preserve pinned context during unpinned eviction/clear operations.

---

### Task 1: Harden context service boundaries and collection helpers

**Files:**

- Modify: `src/ui/panel.ts`
- Modify: `src/background/context-manager.ts`
- Modify: `src/shared/message-validation.ts` only if needed for tab-group payload validation
- Test: `tests/unit/context.test.ts`

**Interfaces:**

- `panel.ts` exports `readTabGroupsContext`, `request`, and existing context helpers; all runtime errors become thrown `Error`s.
- `context-manager.ts` keeps its existing public functions and ensures pinned items are not evicted when new unpinned items arrive.

- [ ] **Step 1: Write failing tests** for pinned retention when the item limit is reached and for unpinned clearing retaining pinned items.
- [ ] **Step 2: Run `npm test -- tests/unit/context.test.ts` and verify the new retention assertion fails.**
- [ ] **Step 3: Implement minimal pinned-aware staging and a checked runtime request helper.** Add a tab-groups context builder that formats group title, native/fallback status, window, and tab IDs, and handles an empty result.
- [ ] **Step 4: Run the focused context tests and existing unit tests; confirm green.**
- [ ] **Step 5: Commit `feat: harden context staging and collection helpers`.**

### Task 2: Build shared context tray UI

**Files:**

- Create: `src/ui/ContextTray.svelte`
- Modify: `src/ui.css`
- Test: `tests/unit/context-tray.test.ts` if component-test tooling supports it; otherwise cover pure helpers through panel tests

**Interfaces:**

- Component props: `items: ContextItem[]`, `busy: boolean`, `onAction: (action: ContextAction) => void`, `onRemove: (item: ContextItem) => void`, `onPin: (item: ContextItem) => void`, `onClear: (pinnedOnly: boolean) => void`.
- `ContextAction` is `'page' | 'selection' | 'html' | 'clipboard' | 'tabs' | 'tab-groups' | 'screenshot'`.

- [ ] **Step 1: Add the component contract and render assertions for all explicit actions.**
- [ ] **Step 2: Verify the test fails because the component does not exist or lacks actions.**
- [ ] **Step 3: Implement an accessible tray: action buttons grouped by source, item count/limit, text previews with truncation indicators, screenshot thumbnails, pin/unpin, remove, clear unpinned, and clear all.** Disable actions while busy and use visible labels/tooltips.
- [ ] **Step 4: Add focused styling with keyboard focus, responsive wrapping, image sizing, and reduced-motion-safe transitions; run formatting/lint/typecheck.**
- [ ] **Step 5: Commit `feat: add shared context tray`.**

### Task 3: Refactor panel and sidebar to shared app

**Files:**

- Create: `src/ui/PanelApp.svelte`
- Replace: `src/sidepanel/App.svelte`
- Replace: `src/sidebar/App.svelte`
- Modify: `src/ui/panel.ts`

**Interfaces:**

- `PanelApp.svelte` owns settings, active connection, frame fallback, loading/error state, and tray actions.
- Sidepanel and sidebar remain thin entry-specific wrappers that mount the shared component; their HTML/main entrypoints stay compatible.

- [ ] **Step 1: Add a shared-app import/render smoke test or compile-level test expectation.**
- [ ] **Step 2: Verify it fails before the shared app exists.**
- [ ] **Step 3: Move duplicated panel logic into `PanelApp.svelte` and make both App files re-export/render it. Wire every tray action to the corresponding panel helper and stage through the background context manager.
- [ ] **Step 4: Add permission-aware notices, actionable recovery copy, busy state, preview updates, and no automatic collection.**
- [ ] **Step 5: Run `npm run format:check && npm run lint && npm run typecheck && npm test`; fix all failures.**
- [ ] **Step 6: Commit `refactor: share panel and sidebar context UX`.**

### Task 4: Settings and final verification

**Files:**

- Modify: `src/settings/Settings.svelte` only for consistent error/loading/accessibility treatment if needed
- Modify: relevant shared UI files only

- [ ] **Step 1: Review settings against the shared error and privacy language; add only narrowly scoped improvements.**
- [ ] **Step 2: Run `npm run validate`.**
- [ ] **Step 3: Run `npm run build` and inspect `git diff --check`, `git status`, and the final diff.**
- [ ] **Step 4: Commit `chore: verify production context UX`.**

## Self-review checklist

- Page, selection, HTML, clipboard, tabs, tab groups, and visible screenshot each have explicit controls.
- Permission failures from background requests are thrown and displayed in the shared UI.
- Text and screenshot previews are bounded; item count and source limits are visible.
- Pin/unpin, clear unpinned, clear all, remove, deduplication, and pinned retention are covered.
- Sidepanel/sidebar no longer contain duplicated panel implementation.
- No bridge protocol, CI, credentials, or automatic collection changes.
- Validate, test, typecheck, build, and commit before reporting completion.

Plan complete and saved to `docs/superpowers/plans/2026-02-01-production-context-ux.md`. I will execute it inline with checkpoints because the requested implementation and verification are explicitly requested in this session.

---

## Execution notes

This plan is being executed inline in the current session rather than delegated. The implementation will preserve existing behavior while replacing duplicated UI with shared components and adding the missing production context actions.
