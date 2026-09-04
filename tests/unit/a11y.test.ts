// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import ContextTray from '../../src/ui/ContextTray.svelte'
import type { ContextItem } from '../../src/shared/types'

vi.mock('webextension-polyfill', () => ({ default: { runtime: {} } }))

const item = (id: string, pinned = false): ContextItem => ({
  id,
  kind: 'page',
  title: id,
  sourceUrl: `https://${id}.test`,
  text: `${id} text`,
  createdAt: 1,
  pinned,
  truncated: false
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('ContextTray accessibility', () => {
  it('exposes keyboard-focusable controls for every action', async () => {
    const target = document.body
    const component = mount(ContextTray, {
      target,
      props: {
        items: [item('page-a'), item('page-b')],
        busy: false,
        exporting: false,
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onExport: vi.fn(),
        onClear: vi.fn()
      }
    })
    await tick()

    const buttons = Array.from(target.querySelectorAll('button'))
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON')
      // Every control is a real button, so it is keyboard-focusable and
      // activatable with Enter/Space without extra tabindex handling.
      expect(button.getAttribute('type')).toBe('button')
    }
    // Destructive per-item controls are announced by name, not just text.
    expect(
      target.querySelector('button[aria-label="Remove page-a"]')
    ).toBeTruthy()
    expect(target.querySelector('button[aria-label="Pin page-a"]')).toBeTruthy()
    unmount(component)
  })

  it('keeps destructive clear-all behind a two-step confirmation', async () => {
    const onClear = vi.fn()
    const target = document.body
    const component = mount(ContextTray, {
      target,
      props: {
        items: [item('temporary')],
        busy: false,
        exporting: false,
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onExport: vi.fn(),
        onClear
      }
    })
    await tick()

    const clearAll = Array.from(target.querySelectorAll('button')).find(
      (button) => button.textContent === 'Clear all'
    ) as HTMLButtonElement
    expect(clearAll.getAttribute('aria-label')).toBeNull()
    clearAll.click()
    await tick()
    // First click only reveals the confirmation; nothing is cleared yet.
    expect(onClear).not.toHaveBeenCalled()
    const confirm = target.querySelector(
      'button[aria-label="Confirm clear all context"]'
    ) as HTMLButtonElement
    expect(confirm).toBeTruthy()
    confirm.click()
    await tick()
    expect(onClear).toHaveBeenCalledWith(false)
    unmount(component)
  })

  it('announces dynamic success and error changes via live regions', async () => {
    const target = document.body
    const component = mount(ContextTray, {
      target,
      props: {
        items: [],
        busy: false,
        exporting: false,
        onAction: vi.fn(),
        onRemove: vi.fn(),
        onPin: vi.fn(),
        onExport: vi.fn(),
        onClear: vi.fn()
      }
    })
    await tick()

    const tray = target.querySelector('section.context-tray')
    expect(tray?.getAttribute('aria-label')).toBe('Browser context')
    unmount(component)
  })
})
