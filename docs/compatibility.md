# Compatibility

The extension supports Chromium-family browsers and Firefox from a single source tree. It builds two targets: `dist/chromium` and `dist/firefox`.

## Browser surfaces

| Surface        | Chromium builds                                   | Firefox builds                                    |
| -------------- | ------------------------------------------------- | ------------------------------------------------- |
| Primary UI     | Native side panel (`side_panel` manifest key)     | Native sidebar (`sidebar_action` manifest key)    |
| Fallback UI    | Extension tab (`src/fallback-tab/index.html`)     | Extension tab (`src/fallback-tab/index.html`)     |
| Settings       | Extension tab (`src/settings/index.html`)         | Extension tab (`src/settings/index.html`)         |
| Background     | MV3 service worker (`background.js`, ES module)   | Background event page (`background.js` script)    |
| Content script | `content.js`, top frames of http/https pages only | `content.js`, top frames of http/https pages only |

The toolbar action opens the native panel when the API is available and falls back to opening the extension tab when it is not or when opening the panel fails.

## Minimum browser versions

| Browser                                     | Minimum | Why                                                                                                                                                                                |
| ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium (Chrome, Edge, Brave, and similar) | 114     | Manifest V3 `sidePanel` API used by the Chromium build. Older Chromium may still load the build, but the side panel surface is unavailable and the extension-tab fallback is used. |
| Firefox                                     | 109     | Manifest V3 background scripts and `browser_specific_settings.gecko.strict_min_version: "109.0"` declared in the Firefox manifest.                                                 |

These are the versions the build targets and validates against. The extension does not use APIs newer than these floors; when a capability is missing at runtime, the capability report in the extension reports it and the UI degrades to the documented fallback.

## Permission differences

| Permission                                     | Chromium                            | Firefox                         |
| ---------------------------------------------- | ----------------------------------- | ------------------------------- |
| `storage`                                      | Granted at install                  | Granted at install              |
| `sidePanel`                                    | Granted at install (build-specific) | Not requested                   |
| `tabs`                                         | Optional                            | Optional                        |
| `activeTab`                                    | Optional                            | Optional                        |
| `scripting`                                    | Optional                            | Optional                        |
| `clipboardRead`                                | Optional                            | Optional                        |
| Host permissions (`http://*/*`, `https://*/*`) | Optional, requested when needed     | Optional, requested when needed |

Notes:

- No broad host permission is required at install time on either browser.
- `tabs`, `activeTab`, `scripting`, and `clipboardRead` are requested only when the corresponding feature is first used, from a user gesture, and can be revoked from the settings page or the browser's permission UI.
- The Firefox build omits the Chromium-only `sidePanel` permission; the Chromium build omits the Firefox-only `sidebar_action`.

## Restricted pages

Browser-restricted pages do not support page reading, scripting, or screenshot capture. This includes at least:

- Browser internal pages (`chrome://`, `edge://`, `about:`, and similar).
- Browser extension stores and other privileged store pages.
- Privileged PDF and print preview views.
- The browser's settings, history, and new-tab pages.

On these pages, page-read actions fail with an actionable error rather than silently producing empty context. The workaround is to select text manually and use the clipboard action, or to copy content yourself.

## Iframe embedding fallback

The panel embeds the configured Open WebUI server in an iframe. Embedding is best effort:

- If the server does not respond within the embed timeout, or blocks framing (for example via `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`), the panel shows an explicit "could not be embedded" state.
- From that state you can open the server in a normal browser tab ("Open in tab") or retry the embed.
- A normal browser tab is the compatibility authority: origin, authentication, and session behavior always work there, even when iframe embedding does not.

The page bridge only accepts messages from the top frame of a configured Open WebUI origin. Sub-frames and non-configured origins are ignored.

## Memory-only context

Staged context (page text, selections, HTML, clipboard text, tab metadata, tab groups, screenshots) is kept in memory only:

- It is not written to `browser.storage.local`; only connection metadata and preferences persist.
- It is lost when the background service worker is suspended and restarted (Chromium) or the background event page is unloaded (Firefox), when the browser restarts, when the extension is updated or reloaded, and when you clear it yourself.
- Pinning protects items from "Clear unpinned" and from post-export clearing, but pinned items are still lost on a background restart because nothing is persisted.
- The tray holds at most 20 items; staging beyond that evicts the oldest unpinned item (or the oldest item if everything is pinned).

## Composer insertion contract (no auto-submit)

The extension never submits a chat message automatically. Composer integration is event-only and capability-gated:

- The extension sends a `context:insert-text` event to the Open WebUI page through the bridge only when the page reports the `contextTextInsert` capability; otherwise the Insert button is not offered and insertion reports that the page does not support it.
- Insertion places text into the page's composer input only. The user still reviews and sends the message. The extension cannot and does not press send.
- Text is bounded to 32 KiB per insertion, image items cannot be inserted as text, and the page must acknowledge the insertion; an unacknowledged request times out with an error.
- Screenshots and raw HTML are staged locally only. There is no attachment-upload or screenshot-transmission contract in version 1; text export omits screenshot data entirely.

## Screenshot and HTML limitations

- Screenshots capture the visible tab only (`captureVisibleTab`); full-page capture is not supported (`fullPageCapture` is always `false` in the capability report).
- Screenshots larger than the 8 MiB limit are rejected rather than truncated.
- Screenshots stay in the extension as local previews; they are not transmitted to the server and are excluded from text export.
- Raw HTML is capped at 150,000 characters; page text at 100,000 and clipboard text at 50,000. Truncated items are marked "preview limited" in the tray.
- Tab metadata staging reads up to 100 tabs and 50 tab groups. Tab groups use the native Chromium group API; Firefox uses a window-based fallback labeled "window fallback" in the staged text.
