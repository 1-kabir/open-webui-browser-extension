# Task 5 Report: Documentation (compatibility, installation, troubleshooting, threat model)

## Status

Complete. Commit `d2346c5` on branch `project-completion`.

## Files

Created:
- `docs/compatibility.md` — Chromium/Firefox surfaces (side panel, sidebar, fallback tab, service worker vs. background scripts), minimum versions (Chromium 114 for `sidePanel`; Firefox 109 per `strict_min_version`), permission differences per build, restricted pages, iframe-embedding fallback, memory-only context and service-worker restart loss, event-only composer insertion contract (no auto-submit), and screenshot/HTML limitations.
- `docs/threat-model.md` — assets, actors, data flow, trust boundaries (configured server, embedded iframe, bridge senders, extension messages), permission model, explicit non-goals, residual risks.
- `docs/installation.md` — prerequisites, verified build commands, install steps for Chromium (`chrome://extensions` → Load unpacked → `dist/chromium`) and Firefox (`about:debugging` → Load Temporary Add-on → `dist/firefox/manifest.json`), first-run setup, per-feature permission table, verification checklist.
- `docs/troubleshooting.md` — scenarios keyed to actual implemented behavior and actual safe error strings from `src/` (permission denials, restricted pages, "could not be embedded", clipboard/tabs/screenshot failures, memory-only tray loss, insertion capability gate, no auto-submit).

Modified:
- `README.md` — added documentation index, verified build outputs (`dist/chromium`, `dist/firefox`), unpacked/temporary-load instructions, implemented feature summary (event-only insertion, no auto-submit, memory-only context), and the ecosystem framing ("for the Open WebUI ecosystem", not official).
- `docs/implementation-plan.md` — added the four new docs to the repository-structure listing and an "Implementation status" section recording deliberate deviations from the phase list: event-only capability-gated insertion, memory-only context, visible-tab-only capture, Firefox window-fallback tab groups.

## Command/path verification (all checked against the repo, not assumed)

- `npm install` — node_modules present; `npm ci` lockfile committed (CI uses it).
- `npm run validate` — run below; format/lint/typecheck/test.
- `npm test` — 55 tests, 8 files, all passing.
- `npm run build` — run below; produced `dist/chromium/` and `dist/firefox/`, each with `manifest.json`, `background.js`, `content.js`, `sidepanel.js`, `sidebar.js`, `fallback.js`, `settings.js`, `src/{sidepanel,sidebar,fallback-tab,settings}/`; `verify-build.mjs` printed "Build artifacts and manifest references are valid."
- `dist/chromium` and `dist/firefox` load-unpacked paths — both directories exist post-build with valid MV3 manifests.
- Firefox minimum 109 — read from generated `dist/firefox/manifest.json` (`browser_specific_settings.gecko.strict_min_version: "109.0"`).
- Chromium 114 — documented as the floor for the `sidePanel` API surface; older Chromium still works via the fallback tab (matches the implemented `sidePanel?.open` → fallback behavior in `service-worker.ts`).
- Permissions, limits (20 items, 100 tabs, 50 groups, 8 MiB screenshot, 32 KiB insert, 100k/150k/50k text caps), restricted-page behavior, iframe 8-second timeout, 5-second connection test and insert acknowledgement timeout, "window fallback" tab-group labeling, pinned-eviction and post-export clearing — all read from `src/` (vite.config.ts manifest, shared/limits.ts, message-router.ts, context-manager.ts, PanelApp.svelte, connection-manager.ts, protocol.ts) rather than invented.

## Validation evidence

- `npx prettier --write` on README and the four new docs: applied (compatibility, threat-model, installation); README/troubleshooting/implementation-plan already clean.
- `npm run validate` → format:check flagged 4 PRE-EXISTING files only (`.superpowers/sdd/.../task-2-report.md`, `task-4-brief.md`, `task-5-brief.md`, `docs/superpowers/plans/2026-02-02-project-completion.md`); confirmed pre-existing by stashing all Task 5 changes and re-running on the clean `9a83957` tree — identical 4 warnings. None are files this task created or modified. Lint, typecheck, and test all pass (55/55). lint, typecheck, and test portions of validate pass; format:check's pre-existing warnings are the only red and are documented as a concern below.
- `npm run build` → success; verify-build passed.
- `git diff --check` → clean (no whitespace errors).
- Test counts unchanged from baseline: 55 passing across 8 files (documentation-only change).

## Concerns

1. `npm run validate` fails at the format:check step due to 4 pre-existing unformatted files under `.superpowers/` and `docs/superpowers/` (present at baseline commit `9a83957`). Fixing them would mean reformatting SDD ledger/brief files; left untouched to keep this change documentation-only and to avoid rewriting the working notes. Recommend a follow-up either adding those paths to `.prettierignore` or running Prettier on them in a separate commit.
2. The build regenerates `dist/` on every `npm run build`; `dist/` is git-ignored, so documented paths are only guaranteed to exist after a build (documented as such in installation.md).
3. Browser minimums are documented from the manifest (`strict_min_version`) and the `sidePanel` API requirement; no automated browser-matrix smoke test exists yet (that is Task 6's scope).
