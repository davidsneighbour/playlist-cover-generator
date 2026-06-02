import { describe, it, expect } from 'vitest'
import { SHARE_PARAM, encodeShareState, decodeShareState, readShareToken } from '../src/lib/share'

describe('encodeShareState / decodeShareState', () => {
  it('round-trips a state object (without the background image)', () => {
    const state = {
      texts: [{ id: 1, content: 'Hello' }],
      grid: { enabled: true, spacing: 20 },
      snapToGrid: false,
      backgroundImageData: 'data:image/png;base64,AAAA',
    }
    const token = encodeShareState(state)
    expect(decodeShareState(token)).toEqual({
      texts: [{ id: 1, content: 'Hello' }],
      grid: { enabled: true, spacing: 20 },
      snapToGrid: false,
    })
  })

  it('produces a URL-safe token (no +, /, or =)', () => {
    const token = encodeShareState({ texts: [{ id: 1, content: 'a'.repeat(50) + '???>>>' }] })
    expect(token).not.toMatch(/[+/=]/)
  })

  it('preserves unicode content', () => {
    const state = { texts: [{ id: 1, content: 'café 🎵 naïve' }] }
    expect(decodeShareState(encodeShareState(state))).toEqual(state)
  })

  it('returns null for missing or malformed tokens', () => {
    expect(decodeShareState('')).toBeNull()
    expect(decodeShareState(null)).toBeNull()
    expect(decodeShareState('!!!not-base64!!!')).toBeNull()
  })
})

describe('readShareToken', () => {
  it('extracts the token from a hash', () => {
    const token = encodeShareState({ texts: [] })
    expect(readShareToken(`#${SHARE_PARAM}=${token}`)).toBe(token)
  })

  it('finds it among other hash params', () => {
    expect(readShareToken('#foo=1&s=abc')).toBe('abc')
  })

  it('returns null when absent or empty', () => {
    expect(readShareToken('')).toBeNull()
    expect(readShareToken('#other=1')).toBeNull()
  })
})
