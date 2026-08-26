import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearContext,
  listContext,
  removeContext,
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
})
