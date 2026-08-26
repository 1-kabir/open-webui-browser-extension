<script lang="ts">
  import type { ContextItem, ContextKind } from '../shared/types'
  export type ContextAction = Exclude<ContextKind, 'html'> | 'html'
  export let items: ContextItem[] = []
  export let busy = false
  export let onAction: (action: ContextAction) => void
  export let onRemove: (item: ContextItem) => void
  export let onPin: (item: ContextItem) => void
  export let onClear: (pinnedOnly: boolean) => void

  const actions: Array<{ id: ContextAction; label: string; hint: string }> = [
    { id: 'page', label: 'Page', hint: 'Read the current page' },
    { id: 'selection', label: 'Selection', hint: 'Read selected text' },
    { id: 'html', label: 'HTML', hint: 'Read page HTML' },
    { id: 'clipboard', label: 'Clipboard', hint: 'Read clipboard text once' },
    { id: 'tabs', label: 'Tabs', hint: 'Stage open tabs' },
    { id: 'tab-groups', label: 'Tab groups', hint: 'Stage tab groups' },
    {
      id: 'screenshot',
      label: 'Screenshot',
      hint: 'Capture the visible tab once'
    }
  ]

  function preview(item: ContextItem) {
    if (item.dataUrl) return 'Visible screenshot'
    return (
      item.text?.slice(0, 180).replace(/\s+/g, ' ') || 'No preview available'
    )
  }
</script>

<section class="context-tray" aria-label="Browser context">
  <div class="tray-heading">
    <div>
      <p class="eyebrow">Context tray</p>
      <h2>Choose what to share</h2>
    </div>
    <span class="item-count">{items.length} / 20</span>
  </div>
  <div class="context-actions">
    {#each actions as action}
      <button
        type="button"
        onclick={() => onAction(action.id)}
        disabled={busy}
        title={action.hint}
      >
        {action.label}
      </button>
    {/each}
  </div>
  <p class="privacy-note">
    Nothing is collected automatically. Clipboard and screenshots require your
    click.
  </p>
  {#if items.length}
    <div class="context-list">
      {#each items as item (item.id)}
        <article class="context-card">
          <div class="context-card-header">
            <div>
              <strong>{item.title}</strong>
              <small
                >{item.kind}{item.truncated ? ' · preview limited' : ''}</small
              >
            </div>
            <div class="context-card-actions">
              <button
                type="button"
                onclick={() => onPin(item)}
                aria-label={item.pinned
                  ? `Unpin ${item.title}`
                  : `Pin ${item.title}`}
              >
                {item.pinned ? 'Pinned' : 'Pin'}
              </button>
              <button
                type="button"
                onclick={() => onRemove(item)}
                aria-label={`Remove ${item.title}`}>Remove</button
              >
            </div>
          </div>
          {#if item.dataUrl}
            <img
              src={item.dataUrl}
              alt="Visible tab preview"
              class="screenshot-preview"
            />
          {:else}
            <p class="context-preview">
              {preview(item)}{item.text && item.text.length > 180 ? '…' : ''}
            </p>
          {/if}
          {#if item.sourceUrl}<a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer">Open source</a
            >{/if}
        </article>
      {/each}
    </div>
    <div class="tray-footer">
      <button type="button" onclick={() => onClear(true)} disabled={busy}
        >Clear unpinned</button
      >
      <button type="button" onclick={() => onClear(false)} disabled={busy}
        >Clear all</button
      >
    </div>
  {:else}
    <p class="empty-tray">
      Your selected context will appear here before it reaches the chat.
    </p>
  {/if}
</section>
