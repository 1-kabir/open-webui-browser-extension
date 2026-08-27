# Privacy, Permissions, and Security

## Data flow

The extension stores only connection metadata and preferences in browser extension storage. Page text, selections, HTML, clipboard contents, tab metadata, and screenshots are collected only after an explicit action and remain memory-only in the extension context until the user uses or clears them. Staged context is not written to browser storage; it is lost when the service-worker restarts or the extension is reloaded.

The extension does not install a model runtime, proxy authentication, read cookies, read `localStorage` tokens, inspect passwords, or transmit telemetry. Staged context is not sent to an Open WebUI server automatically; version 1 has no automatic message-submission or screenshot-upload contract.

## Permissions

| Permission      | Purpose                                               | When used                                          |
| --------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `storage`       | Save connections and preferences                      | Always                                             |
| `tabs`          | Read bounded tab metadata and open configured servers | When the user uses tab features or opens a server  |
| `activeTab`     | Temporarily access the visible tab                    | After a page-read, clipboard, or screenshot action |
| `scripting`     | Execute the bounded page reader                       | After a page-read action                           |
| `clipboardRead` | Read clipboard text                                   | Only after the clipboard action                    |
| `sidePanel`     | Chromium side-panel surface                           | Chromium builds only                               |

Permission denial produces an actionable error and does not cause background collection. Browser-restricted pages such as browser settings, extension stores, and privileged PDF viewers may not support page reading.

## Trust boundaries

- The configured Open WebUI server is an external origin and may be remote or local.
- The embedded server is not granted arbitrary extension APIs.
- The optional page bridge validates origin, source window, protocol version, nonce, bounded IDs, and an allowlist of request names.
- Context is user-controlled input. Do not stage secrets or personal data unless the user intends to send them to the configured server.

## Threat model

The extension mitigates accidental collection and confused-deputy behavior by requiring explicit user actions, avoiding credentials in URLs, using bounded payloads, rejecting unknown bridge requests, and keeping sensitive content out of logs and persistent storage. A compromised configured Open WebUI server can still see data the user intentionally submits to it; the extension cannot make that server trustworthy.

Iframe embedding is best effort. If a server blocks framing or behaves differently in an iframe, use **Open in tab**, where normal browser origin and authentication behavior applies.

## Retention and export

- Context remains memory-only by default and is lost when the service worker restarts; connection metadata and preferences are the only persisted data.
- Text export includes readable text and source URLs, but never screenshot data URLs. A successful export clears only unpinned items, preserving pinned items for reuse.
- Clear all requires an explicit confirmation in the context tray.

## Limitations

- Extension version 1 does not submit staged context into a chat composer automatically.
- Screenshots and raw HTML are staged locally but require an explicit future attachment contract before transmission. Text export omits screenshot data URLs, and a successful export clears only unpinned context; pinned items remain until explicitly cleared.
- Browser API support differs across Chromium and Firefox. Capability reports and fallback surfaces are authoritative.
