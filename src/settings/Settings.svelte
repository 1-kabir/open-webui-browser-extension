<script lang="ts">
  import browser from 'webextension-polyfill'
  import type { CapabilityReport, Connection, Settings } from '../shared/types'
  import type { PermissionState } from '../background/permission-manager'

  let settings: Settings = {
    connections: [],
    defaultConnectionId: null,
    theme: 'system'
  }
  let permissions: PermissionState = {
    tabs: false,
    activeTab: false,
    scripting: false,
    clipboardRead: false
  }
  let capabilities: CapabilityReport | undefined
  let name = ''
  let url = ''
  let error = ''
  let status = ''
  let editingId = ''
  let editName = ''
  let editUrl = ''
  let testingId = ''
  let testResults: Record<string, string> = {}

  async function send<T>(message: unknown): Promise<T> {
    const result = (await browser.runtime.sendMessage(message)) as T & {
      error?: string
    }
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      result.error
    )
      throw new Error(result.error)
    return result
  }
  async function load() {
    try {
      ;[settings, permissions, capabilities] = await Promise.all([
        send<Settings>({ type: 'settings:get' }),
        send<PermissionState>({ type: 'permissions:get' }),
        send<CapabilityReport>({ type: 'capabilities:get' })
      ])
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to load settings.'
    }
  }
  async function add() {
    error = ''
    try {
      const input = await send<{ url: string }>({
        type: 'connection:validate',
        url
      })
      await send({ type: 'connections:add', input: { name, url: input.url } })
      settings = await send<Settings>({ type: 'settings:get' })
      name = ''
      url = ''
      status = 'Connection saved.'
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to add connection.'
    }
  }
  function beginEdit(connection: Connection) {
    editingId = connection.id
    editName = connection.name
    editUrl = connection.url
    error = ''
  }
  function cancelEdit() {
    editingId = ''
  }
  async function saveEdit(connection: Connection) {
    error = ''
    try {
      settings = await send<Settings>({
        type: 'connections:update',
        id: connection.id,
        input: { name: editName, url: editUrl }
      })
      editingId = ''
      status = 'Connection updated.'
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to update connection.'
    }
  }
  async function testConnection(connection: Connection) {
    testingId = connection.id
    error = ''
    try {
      const result = await send<{
        ok: boolean
        status?: number
        error?: string
      }>({
        type: 'connection:test',
        url: connection.url
      })
      testResults = {
        ...testResults,
        [connection.id]: result.ok
          ? `Reachable (HTTP ${result.status ?? 'unknown'}).`
          : (result.error ??
            `Unreachable (HTTP ${result.status ?? 'unknown'}).`)
      }
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to test connection.'
    } finally {
      testingId = ''
    }
  }
  async function remove(connection: Connection) {
    try {
      settings = await send<Settings>({
        type: 'connections:remove',
        id: connection.id
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to remove connection.'
    }
  }
  async function makeDefault(connection: Connection) {
    try {
      settings = await send<Settings>({
        type: 'connections:set-default',
        id: connection.id
      })
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Unable to select default connection.'
    }
  }
  async function updateTheme() {
    try {
      settings = await send<Settings>({
        type: 'settings:update',
        patch: { theme: settings.theme }
      })
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to save theme.'
    }
  }
  async function revoke(permission: keyof PermissionState) {
    try {
      permissions = await send<PermissionState>({
        type: 'permissions:remove',
        permission
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to revoke permission.'
    }
  }
  load()
</script>

<div class="settings">
  <h1>Open WebUI Settings</h1>
  <p>
    Connections and preferences stay in this browser. The extension never stores
    passwords or tokens.
  </p>
  <form
    onsubmit={(event) => {
      event.preventDefault()
      void add()
    }}
  >
    <label
      >Name<input
        bind:value={name}
        required
        maxlength="100"
        placeholder="My Open WebUI"
      /></label
    >
    <label
      >Server URL<input
        bind:value={url}
        required
        maxlength="2048"
        placeholder="https://chat.example.com or http://localhost:8080"
      /></label
    >
    <button type="submit">Add connection</button>
  </form>
  {#if error}<p class="notice" role="alert">{error}</p>{/if}
  {#if status}<p role="status">{status}</p>{/if}

  <h2>Connections</h2>
  {#if !settings.connections.length}<p>No connections configured.</p>{/if}
  {#each settings.connections as connection}
    <div class="context-item">
      {#if editingId === connection.id}
        <form
          onsubmit={(event) => {
            event.preventDefault()
            void saveEdit(connection)
          }}
        >
          <label
            >Name<input bind:value={editName} required maxlength="100" /></label
          >
          <label
            >Server URL<input
              bind:value={editUrl}
              required
              maxlength="2048"
            /></label
          >
          <button type="submit">Save</button>
          <button type="button" onclick={cancelEdit}>Cancel</button>
        </form>
      {:else}
        <span
          >{connection.name}<br /><small>{connection.url}</small
          >{#if settings.defaultConnectionId === connection.id}<br /><small
              >Default connection</small
            >{/if}
          >{#if testResults[connection.id]}<br /><small role="status"
              >{testResults[connection.id]}</small
            >{/if}</span
        >
        <span class="actions">
          {#if settings.defaultConnectionId !== connection.id}<button
              onclick={() => void makeDefault(connection)}
              >Use by default</button
            >{/if}
          <button onclick={() => beginEdit(connection)}>Edit</button>
          <button
            onclick={() => void testConnection(connection)}
            disabled={testingId === connection.id}
            >{testingId === connection.id
              ? 'Testing…'
              : 'Test connection'}</button
          >
          <button onclick={() => void remove(connection)}>Remove</button>
        </span>
      {/if}
    </div>
  {/each}

  <h2>Appearance</h2>
  <label
    >Theme<select
      bind:value={settings.theme}
      onchange={() => void updateTheme()}
      ><option value="system">System</option><option value="light">Light</option
      ><option value="dark">Dark</option></select
    ></label
  >

  <h2>Permissions</h2>
  <p>
    Optional access is requested only when its feature is used. Revoking access
    disables that feature until requested again.
  </p>
  {#each Object.entries(permissions) as [permission, granted]}
    <div class="context-item">
      <span>{permission}: {granted ? 'granted' : 'not granted'}</span
      >{#if granted}<button
          onclick={() => void revoke(permission as keyof PermissionState)}
          >Revoke</button
        >{/if}
    </div>
  {/each}

  <h2>Diagnostics</h2>
  {#if capabilities}<dl>
      <dt>Browser</dt>
      <dd>{capabilities.browser}</dd>
      <dt>Native panel</dt>
      <dd>
        {capabilities.sidePanel || capabilities.sidebar
          ? 'available'
          : 'fallback tab'}
      </dd>
      <dt>Tab groups</dt>
      <dd>{capabilities.tabGroups ? 'available' : 'fallback metadata'}</dd>
      <dt>Capture</dt>
      <dd>{capabilities.capture ? 'available' : 'unavailable'}</dd>
    </dl>{/if}
</div>
