# Open WebUI Browser Integration Protocol

## Status

Proposed version 1 contract for an optional browser-host integration. It is intentionally not compatible with Electron IPC or `window.electronAPI`, and it never transfers authentication tokens, cookies, passwords, or arbitrary extension functions.

## Trust and session model

- The authenticated Open WebUI session remains owned by the normal Open WebUI page/tab at its own origin.
- The extension does not read or copy `localStorage.token`, cookies, passwords, or page credentials.
- The background worker is not an authenticated Open WebUI API proxy in version 1.
- Embedding is best-effort. A normal browser tab is the compatibility authority when iframe/sidebar embedding is blocked or session behavior differs.
- Every page bridge is bound to the current page, expected origin, source window, and a per-page nonce.

## Envelope

All bridge messages use JSON-serializable data and this envelope:

```ts
interface BridgeMessage {
  protocol: 'open-webui-browser-bridge'
  version: 1
  id: string
  nonce: string
  type:
    'hello' | 'hello:ack' | 'capabilities' | 'request' | 'response' | 'event'
  payload?: unknown
}
```

Rules:

- `id` and `nonce` are non-empty bounded strings.
- Payloads are bounded before parsing and before forwarding.
- Unknown protocol versions or message types are ignored safely.
- Request IDs are accepted once per page session. A duplicate request receives no second side effect.
- Every request has a timeout and may be cancelled by page navigation or bridge shutdown.
- Error payloads use stable display-safe codes and do not contain tokens, cookies, page contents, or sensitive URLs.
- Binary data is not sent through the bridge in version 1. Screenshots remain staged in the extension and require a later, explicit Open WebUI attachment contract.

## Handshake

1. The content bridge creates a cryptographically random page-session nonce.
2. The bridge sends `hello` with `{ client: 'open-webui', connectionId? }`.
3. The extension validates protocol, source, origin, and nonce, then sends `capabilities`.
4. The page may continue normal operation if no extension responds.
5. Navigation, reload, or origin change invalidates the nonce and starts a new handshake.

The page must not be able to choose or reuse a nonce established for another page. The extension must not accept messages from `null` origins or unexpected source windows.

## Message allowlist

### Page to extension

- `hello`: begin capability negotiation.
- `request` with allowlisted names only:
  - `theme:get`
  - `context:list`
  - `context:stage`
  - `context:remove`
  - `navigation:get`

No arbitrary method name dispatch is permitted. Version 1 has no token, cookie, file-system, process, or unrestricted navigation request.

### Extension to page

- `capabilities`: report feature availability and protocol version.
- `response`: correlate a request with `{ ok, result? }` or a safe error.
- `event` with allowlisted names:
  - `context`
  - `theme`
  - `navigation`
  - `connection`

The extension-owned context tray remains the stable UX when page/composer integration is unavailable.

## Capability payload

```ts
interface CapabilityReport {
  browser: 'chromium' | 'firefox' | 'other'
  sidePanel: boolean
  sidebar: boolean
  tabs: boolean
  tabGroups: boolean
  clipboard: boolean
  capture: boolean
  fullPageCapture: boolean
}
```

Capabilities describe the current browser and permission state. They do not grant the page access to the underlying API. The page must request only named integration actions and the extension must enforce permissions independently.

## Context semantics

Context collection is always initiated by an explicit user action in the extension UI or a supported Open WebUI control. The bridge may publish metadata and staged text after collection, but it does not submit a chat message automatically.

A staged context item includes:

- stable item ID;
- kind (`page`, `selection`, `tabs`, `tab-groups`, `clipboard`, `screenshot`, or `html`);
- title and optional source URL;
- text or extension-managed image reference;
- created time;
- bounded size and truncation state;
- pinned/one-time state;
- redaction status.

The user must be able to inspect and remove every item. Context is cleared after successful user submission unless pinned. Version 1 does not define how screenshots or raw HTML become Open WebUI attachments; that requires a separate upstream-compatible submission design.

## Theme and navigation

Theme events preserve Open WebUI's original theme value when available instead of reducing it to light/dark. The extension shell may resolve `system` locally, but page-facing events retain the source value.

Navigation requests accept only validated same-origin, relative Open WebUI paths. External URLs, credential-bearing URLs, javascript URLs, and arbitrary redirects are rejected. Reload is an extension-owned operation, not an arbitrary page command.

## Security requirements

- Check `event.origin`, `event.source`, protocol, version, nonce, message ID, payload schema, and size for every message.
- Never expose a dynamic property lookup such as `window.electronAPI[request.type]`.
- Never forward raw browser API objects to the page.
- Never log bridge payloads or full source URLs.
- Clear page-session state on navigation and shutdown.
- Keep sensitive raw context in memory where practical and avoid extension storage.
- Treat the configured Open WebUI server as an external trust boundary.

## Compatibility

Basic embedding and normal browser-tab operation do not require this protocol. Protocol features must be optional and capability-driven. Open WebUI should remain fully usable when the extension is absent, blocked, unsupported, or out of date.

A future upstream hook may implement these semantics directly, but it must remain optional, versioned, narrowly scoped, and independent of Electron.
