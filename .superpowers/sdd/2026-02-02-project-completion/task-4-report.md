# Task 4: Optional text-context composer negotiation

## Scope

Implemented Task 4 from the project-completion SDD without modifying the sibling `open-webui` repository.

## Changes

- Extended `CapabilityReport` in `src/shared/types.ts` with optional `contextTextInsert?: boolean`.
- Added `InsertTextArgs`, `InsertTextItem`, `HelloAckPayload`, `MAX_CONTEXT_TEXT_BYTES`, `isBoundedContextText`, and `isValidInsertTextArgs` to `src/integration/protocol.ts` for bounded payload validation at the existing protocol boundary.
- Allowed `context:insert-text` in the extension-to-page event set only, with strict schema validation: only plain text (UTF-8 ≤ 32 KiB), and only sanitized `ContextItem` metadata (`id`, `kind`, `title`, `createdAt`, `truncated`). The page-to-extension request form was removed in the Task 4 review fix round; see below.
- Added `contextTextInsert` to the extension capability report and wired acknowledgement handling for both `hello:ack.capabilities` and `event[name=capabilities]`.
- Added public `insertText(item)` on the bridge interface that sends the bounded event only when explicitly called; no auto-submit or token handling.
- Added response acknowledgement path: the bridge resolves a pending `InsertTextAcknowledgement` only when the host returns `{ ok: true, result: { inserted: true } }` matched to the exact message ID under the validated nonce/origin/source.
- `src/content/content.ts` initially validated and forwarded `context:insert-text` requests to the service worker; this dead path was removed in the Task 4 review fix round (see below).
- Added an optional `expectedSource` to `OpenWebUIBridgeOptions` so the embedded panel path can bind validation to the iframe window and origin.
- Added `onInsert` and `contextTextInsert` to `ContextTray.svelte`; the tray initially showed a single `Insert into chat` action bound to `items[0]`, replaced by per-card `Insert` controls in the Task 4 review fix round (see below).
- Wired the panel bridge lifecycle in `PanelApp.svelte`: the panel creates the bridge after iframe load, receives host capability acknowledgement, and exposes insertion only then; bridge is stopped on connection change and component teardown.
- Added a host-side example to `docs/integration-protocol.md` without editing the sibling `open-webui` repository.

## Test coverage

- Capability negotiation: `protocol.test.ts` verifies `contextTextInsert` is included in the capability report and rejected when incorrectly typed.
- Insertion payload rejection: `protocol.test.ts` rejects image-carrying and oversized UTF-8 payloads at the protocol layer.
- Bridge behavior: `open-webui-bridge.test.ts` covers automatic-submit prevention, bounded event shape, sanitized metadata, image rejection, oversized rejection, capability acknowledgement without auto-insertion, and resolution only for valid same-origin/same-source/same-nonce acknowledgement.
- UI behavior: `open-webui-bridge.test.ts` confirms per-card `Insert` actions appear only when `contextTextInsert: true` and that `Copy context` remains present.
- Existing Task 1-3 tests remain intact and passing.

## Validation

- `npm run test -- --run tests/unit/open-webui-bridge.test.ts tests/unit/protocol.test.ts` — 12 passed (red-then-green; the original report understated this count as 11).
- `npm run test -- --run` — 52 passed across 8 test files at the original Task 4 commit.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx prettier --check` on changed source, test, and doc files — passed.
- `npm run build` — chromium and firefox bundles built successfully.
- `git diff --check` — passed.

## Concerns

- This task remains a bridge-only, capability-gated, text-only contract. No upstream `open-webui` hook was created, so production use depends on a future host-side implementation or upstream acceptance.
- The embedded panel bridge depends on `iframe.contentWindow`, so browsers that restrict cross-origin iframe access may keep the insertion fallback unavailable.
- The protocol is intentionally conservative: images are rejected, auto-submit is forbidden, and acknowledgement payloads are narrowly scoped, but any future extension of insertion semantics should re-audit the payload allowlists.

## Fix report: Task 4 review round (commits c043ef8, fc18372, and evidence commit)

Baseline: `3bff42e`, clean tree, 52 tests passing across 8 files. Review findings addressed: 3 Important, 4 Minor.

### Important 1 — dead `context:insert-text` page-to-extension request path (fix option b)

The documented request path was dead: `content.ts` forwarded `context:insert-text` requests, but neither `extensionMessageTypes` (`src/shared/message-validation.ts`) nor `bridgeTypes` (`src/background/message-router.ts`) allowed the type, so the worker always rejected it. Adopted option (b): the event path is now the only insertion path.

- Removed `context:insert-text` from the bridge request allowlist (`REQUEST_NAMES` in `src/content/open-webui-bridge.ts` was already the only bridge-level gate; the content script no longer names the type at all).
- Deleted the unreachable validation in `src/content/content.ts` (`isValidInsertTextArgs` import, byte re-encode, and the `context:insert-text` branch). `content.ts` now contains no reference to `context:insert-text`.
- Removed the `context:insert-text` special case from the `request` branch of `isValidPayload` in `src/integration/protocol.ts`, with a comment pinning the contract: insertion flows only through the extension-to-page event path.
- Updated `docs/integration-protocol.md`: removed `context:insert-text` from the page-to-extension request allowlist and added an explicit note that insertion is intentionally absent from that set.
- Defense-in-depth kept intact: the worker-side `bridgeTypes`/`extensionMessageTypes` allowlists still exclude `context:insert-text`, so a reintroduced request path would be rejected by the worker even if a future regression re-added it to `content.ts`.

### Important 2 — per-item Insert affordance in ContextTray

`ContextTray.svelte` previously rendered one footer `Insert into chat` button that always inserted `items[0]`. Replaced with:

- A per-card `Insert` button in each context card's action row (`aria-label="Insert {item.title} into chat"`), calling `onInsert(item)` with that card's item.
- The button is rendered only when `contextTextInsert` is true and the item has no `dataUrl` (image items cannot be inserted as text; `Copy context` remains the fallback for them).
- The capability gate (`contextTextInsert`), no-auto-submit behavior, and `Copy context` fallback are unchanged. The footer `Insert into chat` button was removed since it was ambiguous.

### Important 3 — report accuracy and TDD evidence

- Corrected the focused-test count in this report: 12, not 11.
- Added `.superpowers/sdd/2026-02-02-project-completion/task-4-tdd-evidence.md` mirroring `task-3-tdd-evidence.md`: red run at `c043ef8` (5 new behavioral tests failing against the `3bff42e` implementation snapshot, exact output captured) and green run at `fc18372` (17 focused tests passing). The red commit contains only test changes; implementation files were stashed during the red run.

### Minor 1 — derive `contextTextInsert` from real support

The capability report previously hardcoded `contextTextInsert: true`. `src/integration/protocol.ts` now exports `supportsContextTextInsert()`, which reports whether the runtime provides `crypto.randomUUID` (required for the bridge nonce and per-message acknowledgement IDs). `src/content/open-webui-bridge.ts` derives `contextTextInsert` in the capability report from this check instead of hardcoding.

### Minor 2 — acknowledgement check inside `bridge.insertText()`

`insertText()` now runs `isBridgeMessage(message)` over the constructed event before posting and rejects with `Invalid text insertion payload.` if the envelope fails the protocol's own validation (defense-in-depth on top of `isValidInsertTextArgs`).

### Minor 3 — remove redundant byte re-encode in `content.ts`

The content script no longer re-encodes `args.text` with `TextEncoder` to check `MAX_CONTEXT_TEXT_BYTES`; the dead request branch was removed entirely (overlaps with Important 1's deletion).

### Minor 4 — hoist per-call Sets in `isValidInsertTextArgs`

The two `new Set([...])` allocations created on every call in `src/integration/protocol.ts` are hoisted to module scope (`insertTextArgsKeys`, `insertTextItemKeys`).

### Test changes

- `tests/unit/protocol.test.ts`: added `derives contextTextInsert support from the environment` (true with real `crypto`, false with `crypto` stubbed to `{}`).
- `tests/unit/ui-behavior.test.ts`: added `text insertion request-path contract` — asserts `content.ts` no longer contains `context:insert-text` or `isValidInsertTextArgs` and that the protocol `request` validator no longer special-cases the name (source-contract pattern already used by this file).
- `tests/unit/open-webui-bridge.test.ts`: added `exposes an Insert action per context card when supported` (two cards, clicks the second, asserts `onInsert` receives that item's id); updated the capability-gate UI test to the per-card affordance and removed the footer-button assertion.
- Removed an exploratory `isBridgeMessage` envelope assertion during the red-to-green transition; the behavioral contract is enforced by the dispatch allowlists and the source contract above (noted in the evidence file).

### Validation (fix round, exact commands and results)

- `NO_COLOR=1 npx vitest run tests/unit/protocol.test.ts tests/unit/open-webui-bridge.test.ts tests/unit/ui-behavior.test.ts --reporter=verbose` — red run at `c043ef8`: `Tests 5 failed | 13 passed (18)` (exit 1); green run at `fc18372`: `Tests 17 passed (17)` (exit 0). Full output in `task-4-tdd-evidence.md`.
- `npm run test -- --run` — 55 passed across 8 test files (`Tests  55 passed (55)`).
- `npm run typecheck` — passed (exit 0).
- `npm run lint` — passed (exit 0).
- `npx prettier --check` on all changed source, test, and doc files — `All matched files use Prettier code style!`
- `npm run build` — chromium and firefox bundles built; `Build artifacts and manifest references are valid.`
- `git diff --check` — passed (exit 0).

### Commits

- `c043ef8` — `test: record task 4 review red evidence` (tests only; red run captured at this commit)
- `fc18372` — `fix: remove dead insert-text request path and add per-card insert` (implementation; green run)
- Evidence/report/ledger commit: see `.superpowers/sdd/2026-02-02-project-completion/task-4-tdd-evidence.md` and `progress.md`.
