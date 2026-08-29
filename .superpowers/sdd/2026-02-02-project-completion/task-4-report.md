# Task 4: Optional text-context composer negotiation

## Scope

Implemented Task 4 from the project-completion SDD without modifying the sibling `open-webui` repository.

## Changes

- Extended `CapabilityReport` in `src/shared/types.ts` with optional `contextTextInsert?: boolean`.
- Added `InsertTextArgs`, `InsertTextItem`, `HelloAckPayload`, `MAX_CONTEXT_TEXT_BYTES`, `isBoundedContextText`, and `isValidInsertTextArgs` to `src/integration/protocol.ts` for bounded payload validation at the existing protocol boundary.
- Allowed `context:insert-text` in both the page-to-extension request set and the extension-to-page event set, with strict schema validation: only plain text (UTF-8 ≤ 32 KiB), and only sanitized `ContextItem` metadata (`id`, `kind`, `title`, `createdAt`, `truncated`).
- Added `contextTextInsert` to the extension capability report and wired acknowledgement handling for both `hello:ack.capabilities` and `event[name=capabilities]`.
- Added public `insertText(item)` on the bridge interface that sends the bounded event only when explicitly called; no auto-submit or token handling.
- Added response acknowledgement path: the bridge resolves a pending `InsertTextAcknowledgement` only when the host returns `{ ok: true, result: { inserted: true } }` matched to the exact message ID under the validated nonce/origin/source.
- Updated `src/content/content.ts` to validate `context:insert-text` payloads before forwarding to the service worker.
- Added an optional `expectedSource` to `OpenWebUIBridgeOptions` so the embedded panel path can bind validation to the iframe window and origin.
- Added `onInsert` and `contextTextInsert` to `ContextTray.svelte`; the tray now shows `Insert into chat` only when supported, otherwise retains `Copy context`.
- Wired the panel bridge lifecycle in `PanelApp.svelte`: the panel creates the bridge after iframe load, receives host capability acknowledgement, and exposes insertion only then; bridge is stopped on connection change and component teardown.
- Added a host-side example to `docs/integration-protocol.md` without editing the sibling `open-webui` repository.

## Test coverage

- Capability negotiation: `protocol.test.ts` verifies `contextTextInsert` is included in the capability report and rejected when incorrectly typed.
- Insertion payload rejection: `protocol.test.ts` rejects image-carrying and oversized UTF-8 payloads at the protocol layer.
- Bridge behavior: `open-webui-bridge.test.ts` covers automatic-submit prevention, bounded event shape, sanitized metadata, image rejection, oversized rejection, capability acknowledgement without auto-insertion, and resolution only for valid same-origin/same-source/same-nonce acknowledgement.
- UI behavior: `open-webui-bridge.test.ts` confirms `Insert into chat` appears only when `contextTextInsert: true` and that `Copy context` remains present.
- Existing Task 1-3 tests remain intact and passing.

## Validation

- `npm run test -- --run tests/unit/open-webui-bridge.test.ts tests/unit/protocol.test.ts` — 11 passed (red-then-green).
- `npm run test -- --run` — 52 passed across 8 test files.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx prettier --check` on changed source, test, and doc files — passed.
- `npm run build` — chromium and firefox bundles built successfully.
- `git diff --check` — passed.

## Concerns

- This task remains a bridge-only, capability-gated, text-only contract. No upstream `open-webui` hook was created, so production use depends on a future host-side implementation or upstream acceptance.
- The embedded panel bridge depends on `iframe.contentWindow`, so browsers that restrict cross-origin iframe access may keep the insertion fallback unavailable.
- The protocol is intentionally conservative: images are rejected, auto-submit is forbidden, and acknowledgement payloads are narrowly scoped, but any future extension of insertion semantics should re-audit the payload allowlists.
