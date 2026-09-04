# CI/CD

The repository uses GitHub Actions to keep the extension releasable and to publish browser bundles from version tags.

## Pull requests and `main`

The `CI` workflow runs on pull requests and pushes to `main`. It uses Node.js 22 and `npm ci` from the committed lockfile, then runs:

```bash
npm run validate
npm run build
```

`npm run validate` is the local equivalent of the CI quality gate:

- `npm run format:check` — verifies Prettier formatting.
- `npm run lint` — runs ESLint.
- `npm run typecheck` — runs TypeScript without emitting files.
- `npm test` — runs the Vitest unit suite.

A successful build uploads Chromium and Firefox bundles as a short-lived workflow artifact. Generated files remain under `dist/`, which is ignored and must not be committed.

## Optional browser smoke tests

```bash
npm run test:browser
```

This command builds the extension and runs Playwright smoke tests against the built `dist/chromium` and `dist/firefox` artifacts. It is **not** part of `npm run validate` or the CI quality gate.

Behavior when browsers are not available:

- The harness probes for runnable Chromium and Firefox binaries before running. A binary that exists but cannot launch (for example, missing shared libraries) counts as unavailable.
- If no browser can run, the suite is reported as **skipped with an explicit "unavailable" message** — it is not silently passed. The command output states that browser binaries are unavailable and how to install them.
- To enable the suite locally, run `npx playwright install chromium firefox` (and install any missing OS-level shared libraries reported by `npx playwright install-deps`).

Playwright artifacts (`test-results/`, `playwright-report/`) are generated locally and are git-ignored.

## Security analysis and dependency updates

- CodeQL analyzes JavaScript and TypeScript on pull requests, pushes to `main`, and weekly.
- Dependabot checks npm dependencies and GitHub Actions monthly. Review updates like normal code changes and keep the lockfile in sync.

## Releases

Pushing a tag matching `v*.*.*` starts the release workflow. It runs the complete validation and build gates, packages `dist/chromium` and `dist/firefox` into separate ZIP files, and creates a GitHub Release with generated notes.

Example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow requires repository Actions to have permission to write contents. Do not put credentials, server URLs, or user data in release artifacts.
