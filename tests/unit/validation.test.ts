import { describe, expect, it } from 'vitest'
import {
  assertContextText,
  normalizeConnectionUrl
} from '../../src/shared/validation'

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
