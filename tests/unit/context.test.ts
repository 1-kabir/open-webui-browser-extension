import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearContext,
  clearUnpinnedContext,
  listContext,
  pinContext,
  removeContext,
  setContext,
  stageContext
} from '../../src/background/context-manager'
import type { ContextItem } from '../../src/shared/types'
const item = (id: string, text: string): ContextItem => ({
  id,
  kind: 'page',
  title: id,
  sourceUrl: `https://${id}.test`,
  text,
  createdAt: 1,
  pinned: false,
  truncated: false
})
beforeEach(() => clearContext())
describe('context manager', () => {
  it('deduplicates equivalent context', () => {
    stageContext(item('one', 'same'))
    stageContext(item('two', 'same'))
    expect(listContext()).toHaveLength(1)
  })
  it('removes and clears items', () => {
    stageContext(item('one', 'one'))
    stageContext(item('two', 'two'))
    removeContext('one')
    expect(listContext().map((entry) => entry.id)).toEqual(['two'])
    clearContext()
    expect(listContext()).toEqual([])
  })
  it('bounds staged items', () => {
    for (let i = 0; i < 25; i++) stageContext(item(String(i), String(i)))
    expect(listContext()).toHaveLength(20)
    expect(listContext()[0].id).toBe('5')
  })
  it('pins and deduplicates items when replacing state', () => {
    stageContext(item('one', 'one'))
    expect(pinContext('one')).toEqual([{ ...item('one', 'one'), pinned: true }])
    setContext([item('two', 'two'), item('two', 'two')])
    expect(listContext()).toHaveLength(1)
    expect(listContext()[0].id).toBe('two')
  })

  it('retains pinned items when the staging limit is reached', () => {
    stageContext(item('pinned', 'pinned'))
    pinContext('pinned')
    for (let i = 0; i < 20; i++) stageContext(item(`new-${i}`, String(i)))
    const result = listContext()
    expect(result).toHaveLength(20)
    expect(result.some((entry) => entry.id === 'pinned')).toBe(true)
    expect(result.some((entry) => entry.id === 'new-19')).toBe(true)
  })

  it('clears only unpinned items', () => {
    stageContext(item('pinned', 'keep'))
    pinContext('pinned')
    stageContext(item('temporary', 'remove'))
    expect(clearUnpinnedContext().map((entry) => entry.id)).toEqual(['pinned'])
  })
})
