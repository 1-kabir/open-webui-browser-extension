// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import ContextTray from '../../src/ui/ContextTray.svelte'
import type { ContextItem } from '../../src/shared/types'
import { exportAndClearContext } from '../../src/ui/panel'

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

describe('Task 3 context behavior', () => {
  it('exports through the clipboard API before clearing only unpinned context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const clearUnpinned = vi.fn().mockResolvedValue([item('pinned', true)])
    const result = await exportAndClearContext(
      [item('pinned', true), item('temporary')],
      clearUnpinned
    )

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('temporary text')
    )
    expect(writeText).toHaveBeenCalledWith(
      expect.not.stringContaining('data:image')
    )
    expect(clearUnpinned).toHaveBeenCalledOnce()
    expect(result).toEqual([item('pinned', true)])
  })

  it('leaves context intact when the clipboard write fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'))
    Object.assign(navigator, { clipboard: { writeText } })
    const clearUnpinned = vi.fn()

    await expect(
      exportAndClearContext(
        [item('pinned', true), item('temporary')],
        clearUnpinned
      )
    ).rejects.toThrow('clipboard denied')
    expect(clearUnpinned).not.toHaveBeenCalled()
  })

  it('requires confirmation before clear-all, confirms, and cancels without clearing', async () => {
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

    const button = (label: string) =>
      Array.from(target.querySelectorAll('button')).find(
        (entry) => entry.textContent === label
      ) as HTMLButtonElement
    button('Clear all').click()
    await tick()
    expect(onClear).not.toHaveBeenCalled()
    expect(target.textContent).toContain('Confirm clear all')
    ;(
      target.querySelector(
        'button[aria-label="Confirm clear all context"]'
      ) as HTMLButtonElement
    ).click()
    expect(onClear).toHaveBeenCalledWith(false)

    await tick()

    onClear.mockClear()
    button('Clear all').click()
    await tick()
    ;(
      Array.from(target.querySelectorAll('button')).find(
        (button) => button.textContent === 'Cancel'
      ) as HTMLButtonElement
    ).click()
    await tick()
    expect(onClear).not.toHaveBeenCalled()
    expect(target.textContent).toContain('Clear all')
    unmount(component)
  })
})
