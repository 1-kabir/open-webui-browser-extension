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
  async function add() {
    error = ''
    const result = await browser.runtime.sendMessage({
      type: 'connections:add',
      input: {
        name,
        url,
        type:
          url.includes('localhost') || url.includes('127.0.0.1')
            ? 'local'
            : 'remote'
      }
    })
    if (result?.error) {
      error = result.error
      return
    }
    settings = await browser.runtime.sendMessage({ type: 'settings:get' })
    name = ''
    url = ''
  }
  async function remove(connection: Connection) {
    await browser.runtime.sendMessage({
      type: 'connections:remove',
      id: connection.id
    })
    settings = await browser.runtime.sendMessage({ type: 'settings:get' })
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
      <span>{connection.name}<br /><small>{connection.url}</small></span><button
        onclick={() => remove(connection)}>Remove</button
      >
    </div>{/each}
</div>
