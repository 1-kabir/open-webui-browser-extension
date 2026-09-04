# Threat Model

This document describes the extension's trust boundaries, what it protects, what it explicitly does not protect against, and the security properties of the implemented design. It reflects the behavior of the shipped code, not aspirations.

## Assets and actors

| Asset                                                                                      | Sensitivity                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Staged browser context (page text, selections, HTML, clipboard, tab metadata, screenshots) | High — may contain personal or confidential content the user deliberately staged |
| Connection metadata (server names and URLs, preferences)                                   | Low — non-sensitive; the only persisted data                                     |
| Open WebUI credentials, tokens, cookies                                                    | Never accessed by the extension                                                  |
| Local files, process, or browser internals                                                 | Never accessed by the extension                                                  |

Actors:

- **The user**: stages context explicitly and decides what is sent where.
- **The configured Open WebUI server**: an external trust boundary (remote or localhost).
- **Web pages**: untrusted; may attempt to send bridge messages.
- **The extension itself**: local, no network endpoints of its own beyond user-configured servers.

## Data flow and storage

1. Context is collected only after an explicit user action (button click) in the extension UI. Nothing is collected automatically, on a timer, on page load, or on navigation.
2. Staged context lives in memory in the background context manager. It is never written to `browser.storage.local` and never logged.
3. Only connection metadata and preferences are persisted to extension storage.
4. Context leaves the extension only when the user acts: copying formatted text to the clipboard, or (when the Open WebUI page advertises the capability) inserting text into the chat composer. The user then sends the message themselves.
5. Exported text includes item titles, kinds, text, and source URLs. Screenshot data URLs are never included in exports.

## Trust boundaries

- **Configured Open WebUI server.** Anything the user copies or inserts can reach this server. The extension cannot make a compromised or malicious server trustworthy; treat every configured server as an external origin.
- **Embedded page iframe.** The page runs at its own origin with normal web privileges. It receives no extension APIs. The bridge is the only channel, and it is unidirectionally validated.
- **Web pages sending bridge messages.** Every bridge message must match the expected protocol name and version, the configured origin, the expected source window, and the current per-page random nonce. Messages from sub-frames, `null` origins, other origins, or stale sessions are ignored. Replayed request IDs are accepted once per session; later duplicates are silently ignored. Unknown message types are ignored safely.
- **Extension messages.** Runtime messages are validated against an allowlist of known types with bounded payloads. Bridge-scoped request types (`context:list`, `context:stage`, `context:remove`, `theme:get`, `navigation:get`) are additionally restricted to senders on a configured Open WebUI origin with `frameId === 0`. Unknown or malformed messages receive a generic safe error, never a stack trace or internal state.

## Permission model

- Install-time permissions are minimal: `storage` always, plus `sidePanel` on Chromium builds only. No host permissions at install.
- `tabs`, `activeTab`, `scripting`, and `clipboardRead` are optional and requested at the moment a feature needs them, from a user gesture. They can be revoked at any time.
- Denying a permission produces an actionable error in the UI. Denial never triggers background collection or fallback collection.
- The build verification script fails the build if a manifest gains broad permissions (`<all_urls>`, `history`, `bookmarks`), unexpected host permissions, or a missing content-script registration.

## Explicit non-goals and mitigated behaviors

The extension deliberately does not and must not:

- Read cookies, `localStorage` tokens, passwords, or form values.
- Read the clipboard or take screenshots without the user's click.
- Submit chat messages automatically. Composer integration is an event-only text insertion that the page must acknowledge; the user sends the message.
- Upload screenshots or attachments to Open WebUI (no such contract exists in version 1).
- Proxy authenticated Open WebUI API calls from the background worker.
- Telemetry, analytics, or any network endpoint other than user-configured servers.
- Log tokens, cookies, page contents, screenshot data, or URLs containing credentials. Errors surfaced to the UI are from a fixed allowlist of safe, display-only messages.

## Residual risks

- **Compromised server.** A malicious Open WebUI server receives whatever the user deliberately sends it. The extension cannot detect or prevent this.
- **User-staged secrets.** If the user stages a page containing secrets, those secrets are in the context. Mitigation is user judgment; the tray shows previews before export or insertion, and clear-all requires confirmation.
- **Malicious page targeting the bridge.** Mitigated by origin/source/nonce/replay checks and payload bounds. A page that satisfies all checks is by definition the configured server's own page; the worst outcome is bounded, validated context operations the user can see in the tray.
- **Memory loss.** Staged context is lost on background restart. This is a privacy feature (nothing persists), not a durability guarantee.
- **Content script on all http(s) pages.** The content script is registered broadly but is inert: it exposes nothing to the page unless the page speaks the exact bridge protocol, and it never exposes browser APIs. Restricted pages are excluded by the browser itself.
- **Clipboard access.** `clipboardRead` is requested at click time and the text is staged locally; it is not transmitted until the user exports or inserts it.

## Comparison to a browser tab

When in doubt, the extension's exposure is bounded by the same model as a normal browser tab: the server sees what the user sends it, the page cannot reach extension internals, and credentials stay in the browser's normal session handling. The extension adds explicit, user-initiated context staging on top — nothing more.
