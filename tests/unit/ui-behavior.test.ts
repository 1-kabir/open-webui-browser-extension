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
