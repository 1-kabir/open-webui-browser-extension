<script lang="ts">
  import browser from 'webextension-polyfill'
  import type { Connection, Settings } from '../shared/types'
  let settings: Settings = {
    connections: [],
    defaultConnectionId: null,
    theme: 'system'
  }
  let name = ''
  let url = ''
  let error = ''
  async function load() {
    settings = await browser.runtime.sendMessage({ type: 'settings:get' })
  }
  function classify(urlValue: string): 'local' | 'remote' {
    const parsed = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(urlValue.trim())
        ? urlValue.trim()
        : `https://${urlValue.trim()}`
    )
    const hostname = parsed.hostname.toLowerCase()
    const isLoopback =
      hostname === 'localhost' || hostname === '::1' || /^127\./.test(hostname)
    return isLoopback ? 'local' : 'remote'
  }

  async function add() {
    error = ''
    try {
      const normalized = await browser.runtime.sendMessage({
        type: 'connection:validate',
        url
      })
      if (normalized?.error) throw new Error(normalized.error)
      const result = await browser.runtime.sendMessage({
        type: 'connections:add',
        input: {
          name: name.trim(),
          url: normalized.url,
          type: classify(normalized.url)
        }
      })
      if (result?.error) throw new Error(result.error)
      settings = await browser.runtime.sendMessage({ type: 'settings:get' })
      name = ''
      url = ''
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to add connection.'
    }
  }
  async function remove(connection: Connection) {
    error = ''
    try {
      const result = await browser.runtime.sendMessage({
        type: 'connections:remove',
        id: connection.id
      })
      if (result?.error) throw new Error(result.error)
      settings = await browser.runtime.sendMessage({ type: 'settings:get' })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to remove connection.'
    }
  }

  async function makeDefault(connection: Connection) {
    error = ''
    try {
      const result = await browser.runtime.sendMessage({
        type: 'connections:set-default',
        id: connection.id
      })
      if (result?.error) throw new Error(result.error)
      settings = result as Settings
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Unable to select default connection.'
    }
  }
  load()
</script>

<div class="settings">
  <h1>Open WebUI Settings</h1>
  <p>
    Connections stay in this browser. The extension does not install or run a
    local server.
  </p>
  <form
    onsubmit={(event) => {
      event.preventDefault()
      add()
    }}
  >
    <label
      >Name<input
        bind:value={name}
        required
        placeholder="My Open WebUI"
      /></label
    ><label
      >Server URL<input
        bind:value={url}
        required
        placeholder="https://chat.example.com or http://localhost:8080"
      /></label
    ><button type="submit">Add connection</button>
  </form>
  {#if error}<p role="alert">{error}</p>{/if}
  <h2>Connections</h2>
  {#if !settings.connections.length}<p>
      No connections configured.
    </p>{/if}{#each settings.connections as connection}<div
      class="context-item"
    >
      <span>
        {connection.name}<br /><small>{connection.url}</small>
        {#if settings.defaultConnectionId === connection.id}<br /><small
            >Default connection</small
          >{/if}
      </span>
      <span class="actions">
        {#if settings.defaultConnectionId !== connection.id}<button
            onclick={() => makeDefault(connection)}>Use by default</button
          >{/if}
        <button onclick={() => remove(connection)}>Remove</button>
      </span>
    </div>{/each}
</div>
