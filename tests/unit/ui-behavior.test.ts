import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const settingsSource = readFileSync(
  new URL('../../src/settings/Settings.svelte', import.meta.url),
  'utf8'
)
const panelSource = readFileSync(
  new URL('../../src/ui/PanelApp.svelte', import.meta.url),
  'utf8'
)
const contentSource = readFileSync(
  new URL('../../src/content/content.ts', import.meta.url),
  'utf8'
)
const protocolSource = readFileSync(
  new URL('../../src/integration/protocol.ts', import.meta.url),
  'utf8'
)

describe('text insertion request-path contract', () => {
  it('does not offer context:insert-text as a page-to-extension request', () => {
    // The documented page->extension request path is removed; insertion uses
    // only the extension->page event path, so the content script never
    // validates or forwards an insertion request and the protocol request
    // validator must not special-case the name.
    expect(contentSource).not.toContain("'context:insert-text'")
    expect(contentSource).not.toContain('isValidInsertTextArgs')
    expect(protocolSource).toMatch(
      /if \(type === 'request'\) \{\s*\n\s*\/\/ Text insertion flows only through/
    )
  })
})

describe('connection UI behavior', () => {
  it('uses the persisted connection ID for testing', () => {
    expect(settingsSource).toContain(
      "type: 'connection:test',\n        id: connection.id"
    )
    expect(panelSource).toContain(
      "type: 'connection:test',\n        id: active.id"
    )
    expect(settingsSource).not.toContain(
      "type: 'connection:test',\n        url: connection.url"
    )
    expect(panelSource).not.toContain(
      "type: 'connection:test',\n        url: active.url"
    )
  })

  it('provides edit, save, cancel, and explicit test controls', () => {
    expect(settingsSource).toContain(
      'function beginEdit(connection: Connection)'
    )
    expect(settingsSource).toContain('function cancelEdit()')
    expect(settingsSource).toContain(
      'async function saveEdit(connection: Connection)'
    )
    expect(settingsSource).toContain('>Save</button>')
    expect(settingsSource).toContain('>Cancel</button>')
    expect(settingsSource).toContain('Test connection')
    expect(panelSource).toContain('Test connection')
  })
})
