<script lang="ts">
  import browser from 'webextension-polyfill'
  import type { Settings, ContextItem } from '../shared/types'
  let settings: Settings = {
    connections: [],
    defaultConnectionId: null,
    theme: 'system'
  }
  let activeId = ''
  let context: ContextItem[] = []
  $: active = settings.connections.find((item) => item.id === activeId)
  async function load() {
    settings = await browser.runtime.sendMessage({ type: 'settings:get' })
    activeId = settings.defaultConnectionId ?? settings.connections[0]?.id ?? ''
    const stored = await browser.storage.session.get('stagedContext')
    context = stored.stagedContext ? [stored.stagedContext as ContextItem] : []
  }
  async function addContext() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    })
    if (!tab.id) return
    const result = await browser.tabs.sendMessage(tab.id, { type: 'page:read' })
    const item: ContextItem = {
      id: crypto.randomUUID(),
      kind: 'page',
      title: result.title || 'Current page',
      sourceUrl: result.url,
      text: result.text.text,
      createdAt: Date.now(),
      pinned: false,
      truncated: result.text.truncated
    }
    context = [...context, item]
    await browser.storage.session.set({ stagedContext: item })
  }
  function openSettings() {
    void browser.tabs.create({ url: browser.runtime.getURL('settings.html') })
  }
  load()
</script>

<div class="shell">
  <div class="toolbar">
    <select bind:value={activeId} aria-label="Open WebUI connection"
      ><option value="">Choose a connection</option
      >{#each settings.connections as connection}<option value={connection.id}
          >{connection.name}</option
        >{/each}</select
    ><button onclick={openSettings} title="Settings">⚙</button>
  </div>
  {#if context.length}<div class="context">
      <strong>Next message context</strong>{#each context as item}<div
          class="context-item"
        >
          <span>{item.title}</span><button
            onclick={() => {
              context = context.filter((entry) => entry.id !== item.id)
              void browser.storage.session.remove('stagedContext')
            }}>Remove</button
          >
        </div>{/each}
    </div>{/if}
  <div class="toolbar">
    <button onclick={addContext}>Read this page</button>{#if active}<button
        onclick={() => browser.tabs.create({ url: active.url })}
        >Open in tab</button
      >{/if}
  </div>
  {#if active}<iframe title={active.name} src={active.url}></iframe>{:else}<div
      class="empty"
    >
      <h2>Connect Open WebUI</h2>
      <p>Add an existing Open WebUI server in Settings to get started.</p>
      <button onclick={openSettings}>Open Settings</button>
    </div>{/if}
</div>
