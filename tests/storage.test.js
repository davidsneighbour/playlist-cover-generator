import { describe, it, expect } from 'vitest'
import { STORAGE_KEY, serializeState, serializeStateWithoutImage, parseStoredState } from '../src/lib/storage'

describe('STORAGE_KEY', () => {
  it('is a versioned string', () => {
    expect(typeof STORAGE_KEY).toBe('string')
    expect(STORAGE_KEY).toMatch(/:v\d+$/)
  })
})

describe('serializeState', () => {
  it('round-trips a state object through parseStoredState', () => {
    const state = { texts: [{ id: 1, content: 'Hi' }], grid: { enabled: true }, backgroundImageData: 'data:abc' }
    expect(parseStoredState(serializeState(state))).toEqual(state)
  })
})

describe('serializeStateWithoutImage', () => {
  it('omits the background image data but keeps the rest', () => {
    const state = { texts: [], backgroundImageData: 'data:huge', backgroundImage: 'a.png', snapToGrid: true }
    const parsed = parseStoredState(serializeStateWithoutImage(state))
    expect(parsed.backgroundImageData).toBeUndefined()
    expect(parsed).toEqual({ texts: [], backgroundImage: 'a.png', snapToGrid: true })
  })
})

describe('parseStoredState', () => {
  it('returns the object for valid JSON', () => {
    expect(parseStoredState('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null for empty, malformed, or non-object input', () => {
    expect(parseStoredState('')).toBeNull()
    expect(parseStoredState(null)).toBeNull()
    expect(parseStoredState('not json')).toBeNull()
    expect(parseStoredState('[1,2,3]')).toBeNull()
    expect(parseStoredState('42')).toBeNull()
    expect(parseStoredState('null')).toBeNull()
  })
})
