<script lang="ts">
  import browser from 'webextension-polyfill'
  import type { ContextItem, Settings } from '../shared/types'
  import ContextTray, { type ContextAction } from './ContextTray.svelte'
  import {
    clearAll,
    clearUnpinned,
    exportContext,
    loadPanelState,
    pin,
    readClipboardContext,
    readPageContext,
    readScreenshotContext,
    readTabGroupsContext,
    readTabsContext,
    remove,
    stage
  } from './panel'

  let settings: Settings = {
    connections: [],
    defaultConnectionId: null,
    theme: 'system'
  }
  let activeId = ''
  let context: ContextItem[] = []
  let error = ''
  let loading = true
  let busy = false
  let exporting = false
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

  async function addContext(action: ContextAction) {
    error = ''
    busy = true
    try {
      const item =
        action === 'page' || action === 'selection' || action === 'html'
          ? await readPageContext(action)
          : action === 'clipboard'
            ? await readClipboardContext()
            : action === 'tabs'
              ? await readTabsContext()
              : action === 'tab-groups'
                ? await readTabGroupsContext()
                : await readScreenshotContext()
      context = await stage(item)
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Unable to stage browser context.'
    } finally {
      busy = false
    }
  }

  async function removeContext(item: ContextItem) {
    context = await remove(item)
  }
  async function copyContext() {
    error = ''
    exporting = true
    try {
      await exportContext(context)
      context = await clearUnpinned()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to copy context.'
    } finally {
      exporting = false
    }
  }
  async function togglePin(item: ContextItem) {
    context = await pin(item, !item.pinned)
  }
  async function clear(pinnedOnly: boolean) {
    context = pinnedOnly ? await clearUnpinned() : await clearAll()
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
      {#each settings.connections as connection}<option value={connection.id}
          >{connection.name}</option
        >{/each}
    </select>
    <button
      type="button"
      onclick={openSettings}
      title="Settings"
      aria-label="Open settings">⚙</button
    >
  </div>

  <ContextTray
    items={context}
    busy={busy || loading}
    onAction={addContext}
    onRemove={removeContext}
    onPin={togglePin}
    onClear={clear}
    onExport={copyContext}
    {exporting}
  />
  {#if error}<p class="notice" role="alert">{error}</p>{/if}

  {#if active}
    {#if frameState === 'blocked'}
      <div class="empty" role="status">
        <h2>Open WebUI could not be embedded</h2>
        <p>The server may block iframe embedding or be unreachable.</p>
        <div class="actions">
          <button type="button" onclick={openInTab}>Open in browser tab</button
          ><button type="button" onclick={reloadFrame}>Retry</button>
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
      <button type="button" onclick={openSettings}>Open Settings</button>
    </div>
  {/if}
</div>
