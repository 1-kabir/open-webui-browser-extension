import { describe, expect, it } from 'vitest'
import {
  assertContextText,
  normalizeConnectionUrl
} from '../../src/shared/validation'
import { isContextItem } from '../../src/shared/message-validation'

describe('connection validation', () => {
  it('normalizes a host and removes hash and trailing slash', () => {
    expect(normalizeConnectionUrl('example.test/#chat')).toBe(
      'https://example.test'
    )
  })
  it('rejects credential-bearing URLs', () => {
    expect(() =>
      normalizeConnectionUrl('https://user:pass@example.test')
    ).toThrow('credentials')
  })
  it('rejects unsupported protocols', () => {
    expect(() => normalizeConnectionUrl('file:///tmp/chat')).toThrow('HTTP')
  })
})

describe('context limits', () => {
  it('truncates oversized text and reports it', () => {
    expect(assertContextText('abcdef', 3)).toEqual({
      text: 'abc',
      truncated: true
    })
  })
})

describe('context message validation', () => {
  const base = {
    id: 'context-1',
    kind: 'page',
    title: 'Page',
    createdAt: 1,
    pinned: false,
    truncated: false,
    text: 'safe'
  }

  it('accepts HTTP sources and rejects executable data URLs', () => {
    expect(isContextItem({ ...base, sourceUrl: 'https://example.test' })).toBe(
      true
    )
    expect(isContextItem({ ...base, sourceUrl: 'javascript:alert(1)' })).toBe(
      false
    )
    expect(
      isContextItem({
        ...base,
        text: undefined,
        dataUrl: 'data:text/html;base64,PHNjcmlwdD4='
      })
    ).toBe(false)
  })
})
