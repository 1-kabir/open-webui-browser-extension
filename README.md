# Open WebUI Browser Extension

A privacy-first cross-browser extension for connecting to existing Open WebUI servers and staging browser context for chat. It supports Chromium-family browsers and Firefox, with native side-panel/sidebar entry points and an extension-tab fallback.

## Development

```bash
npm install
npm run validate
npm run build
```

`npm run validate` runs the formatting check, ESLint, TypeScript, and the unit tests. The same quality gate runs in GitHub Actions for pull requests and pushes to `main`. See [docs/ci-cd.md](docs/ci-cd.md) for release and security workflow details.

Load `dist/chromium` as an unpacked extension in a Chromium browser or `dist/firefox` temporarily in Firefox. The extension does not install or launch Open WebUI locally.

## Privacy

Browser context is collected only after an explicit user action. The first scaffold stores connection metadata and staged context locally. Do not add telemetry, secret logging, automatic clipboard reads, or background page capture.
