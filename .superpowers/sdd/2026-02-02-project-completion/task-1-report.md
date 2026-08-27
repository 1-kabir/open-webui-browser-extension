# Task 1 report

## Changed files

- `src/background/message-router.ts`: extracted the service-worker message switch into `routeMessage`, added known-message validation, top-level configured-origin enforcement for bridge requests, and stable display-safe error responses.
- `src/background/service-worker.ts`: delegates runtime messages to the router while preserving install and action behavior.
- `src/shared/message-validation.ts`: added the supported extension message registry and message guard.
- `tests/unit/message-router.test.ts`: added focused tests for unknown messages, invalid bridge senders, origin allowlisting, and safe exception responses.

## Tests and outputs

- `npm test -- tests/unit/message-router.test.ts`: passed, 4 tests.
- Initial focused run before implementation: failed because `src/background/message-router.ts` was missing.
- `npm test`: passed, 4 files / 20 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npx prettier --write` was run on changed files.
- `git diff --check`: passed.
- `npm run format:check`: not clean because existing repository documentation files are not formatted, including the task brief, progress ledger, and plan; changed source files were formatted.

## Design decisions

- Kept all existing message names and permission checks, including the existing two-permission page-read path and optional permission requests.
- Bridge-origin checks remain exact-origin checks against configured connection URLs and require a tab sender with frame ID 0.
- Unknown or malformed messages return `Unsupported request.` rather than being silently ignored.
- Known operational validation errors remain display-safe and stable; unexpected exception text is replaced with `Request failed.`.
- The service worker retains its action fallback behavior and only delegates runtime message dispatch.

## Concerns

- The repository-wide format check remains blocked by pre-existing formatting warnings in tracked documentation and plan files outside this task's scope.
- The router retains the original broad switch implementation intentionally to minimize behavioral drift; later tasks can further refine message typing if needed.

## Review fix report

### Finding addressed

`connection:validate` now requires `message.url` to be a string before normalization. Missing, `null`, object, and array values return the stable `Connection URL is required.` validation error instead of being coerced into strings. The supported-message and bridge-message allowlists are now readonly arrays, preserving membership behavior without mutable `Set` instances.

### Tests and outputs

- Before the fix: `npm test -- tests/unit/message-router.test.ts` failed 4 focused regression cases; coerced values included `https://undefined`, `https://null`, and accepted array values.
- After the fix: `npm test -- tests/unit/message-router.test.ts`: passed, 1 file / 8 tests.
- `npm test`: passed, 4 files / 24 tests.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `npm run format:check`: remains blocked by pre-existing formatting warnings in `progress.md`, `task-1-brief.md`, and `docs/superpowers/plans/2026-02-02-project-completion.md`.

### Commit

- Fix committed separately after the original Task 1 implementation commit.
