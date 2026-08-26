<script lang="ts">
  import browser from 'webextension-polyfill'
  import type { ContextItem, Settings } from '../shared/types'
  import {
    loadPanelState,
    readClipboardContext,
    readPageContext,
    readScreenshotContext,
    readTabsContext,
    remove,
    stage
  } from '../ui/panel'

  let settings: Settings = {
    connections: [],
    defaultConnectionId: null,
    theme: 'system'
  }
  let activeId = ''
  let context: ContextItem[] = []
  let error = ''
  let loading = true
  let frameState: 'loading' | 'ready' | 'blocked' = 'loading'
  let frameTimer: ReturnType<typeof setTimeout> | undefined
  $: active = settings.connections.find((item) => item.id === activeId)

  async function load() {
    try {
      const state = await loadPanelState()
      settings = state.settings
      context = state.context
      activeId =
        settings.defaultConnectionId ?? settings.connections[0]?.id ?? ''
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Unable to load extension settings.'
    } finally {
      loading = false
    }
  }

  async function addContext(mode: 'page' | 'selection' | 'html' = 'page') {
    error = ''
    try {
      context = await stage(await readPageContext(mode))
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Unable to read this page.'
    }
  }

  async function removeContext(item: ContextItem) {
    context = await remove(item)
  }

  function openSettings() {
    void browser.tabs.create({
      url: browser.runtime.getURL('src/settings/index.html')
    })
  }

  function openInTab() {
    if (active) void browser.tabs.create({ url: active.url })
  }

  function startFrameTimeout() {
    frameState = 'loading'
    if (frameTimer) clearTimeout(frameTimer)
    frameTimer = setTimeout(() => {
      if (frameState === 'loading') frameState = 'blocked'
    }, 8000)
  }

  function reloadFrame() {
    startFrameTimeout()
    const current = activeId
    activeId = ''
    setTimeout(() => (activeId = current), 0)
  }

  $: if (active?.url) startFrameTimeout()
  load()
</script>

<div class="shell">
  <div class="toolbar">
    <select bind:value={activeId} aria-label="Open WebUI connection">
      <option value="">Choose a connection</option>
      {#each settings.connections as connection}
        <option value={connection.id}>{connection.name}</option>
      {/each}
    </select>
    <button onclick={openSettings} title="Settings">⚙</button>
  </div>

  {#if context.length}
    <div class="context" aria-label="Staged context">
      <strong>Next message context</strong>
      {#each context as item}
        <div class="context-item">
          <span title={item.sourceUrl}>{item.title}</span>
          <button onclick={() => removeContext(item)}>Remove</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="toolbar actions" aria-label="Context actions">
    <button onclick={() => addContext('page')} disabled={loading}
      >Read page</button
    >
    <button onclick={() => addContext('selection')} disabled={loading}
      >Read selection</button
    >
    <button
      onclick={async () => {
        error = ''
        try {
          context = await stage(await readClipboardContext())
        } catch (cause) {
          error =
            cause instanceof Error ? cause.message : 'Unable to read clipboard.'
        }
      }}
      disabled={loading}>Read clipboard</button
    >
    <button
      onclick={async () => {
        error = ''
        try {
          context = await stage(await readTabsContext())
        } catch (cause) {
          error =
            cause instanceof Error ? cause.message : 'Unable to read tabs.'
        }
      }}
      disabled={loading}>Read tabs</button
    >
    <button
      onclick={async () => {
        error = ''
        try {
          context = await stage(await readScreenshotContext())
        } catch (cause) {
          error =
            cause instanceof Error
              ? cause.message
              : 'Unable to capture the tab.'
        }
      }}
      disabled={loading}>Screenshot</button
    >
    {#if active}<button onclick={openInTab}>Open in tab</button>{/if}
  </div>

  {#if error}<p class="notice" role="alert">{error}</p>{/if}

  {#if active}
    {#if frameState === 'blocked'}
      <div class="empty" role="status">
        <h2>Open WebUI could not be embedded</h2>
        <p>The server may block iframe embedding or be unreachable.</p>
        <div class="actions">
          <button onclick={openInTab}>Open in browser tab</button>
          <button onclick={reloadFrame}>Retry</button>
        </div>
      </div>
    {:else}
      {#if frameState === 'loading'}<p class="loading" role="status">
          Loading Open WebUI…
        </p>{/if}
      <iframe
        title={active.name}
        src={active.url}
        onload={() => (frameState = 'ready')}
      ></iframe>
    {/if}
  {:else}
    <div class="empty">
      <h2>Connect Open WebUI</h2>
      <p>Add an existing Open WebUI server in Settings to get started.</p>
      <button onclick={openSettings}>Open Settings</button>
    </div>
  {/if}
</div>
