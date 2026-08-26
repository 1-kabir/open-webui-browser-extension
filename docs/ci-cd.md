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
