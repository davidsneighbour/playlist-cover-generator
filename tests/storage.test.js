import { describe, it, expect } from 'vitest'
import { STORAGE_KEY, serializeState, serializeStateWithoutImage, parseStoredState, serializeStateForExport, parseExportedState, EXPORT_VERSION } from '../src/lib/storage'

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

describe('serializeStateForExport', () => {
  it('omits backgroundImageData and includes a version field', () => {
    const state = { texts: [], backgroundImageData: 'data:huge', snapToGrid: false }
    const parsed = JSON.parse(serializeStateForExport(state))
    expect(parsed.backgroundImageData).toBeUndefined()
    expect(parsed.version).toBe(EXPORT_VERSION)
    expect(parsed.snapToGrid).toBe(false)
  })

  it('produces pretty-printed JSON (has newlines)', () => {
    const json = serializeStateForExport({ texts: [] })
    expect(json).toContain('\n')
  })
})

describe('parseExportedState', () => {
  it('strips the version field and returns the rest', () => {
    const json = JSON.stringify({ version: '1', texts: [], snapToGrid: true })
    const result = parseExportedState(json)
    expect(result.version).toBeUndefined()
    expect(result.texts).toEqual([])
    expect(result.snapToGrid).toBe(true)
  })

  it('handles files without a version field (pre-versioned)', () => {
    const json = JSON.stringify({ texts: [], snapToGrid: false })
    const result = parseExportedState(json)
    expect(result).toEqual({ texts: [], snapToGrid: false })
  })

  it('returns null for empty, malformed, or non-object input', () => {
    expect(parseExportedState('')).toBeNull()
    expect(parseExportedState(null)).toBeNull()
    expect(parseExportedState('not json')).toBeNull()
    expect(parseExportedState('[1,2,3]')).toBeNull()
  })

  it('round-trips through serializeStateForExport', () => {
    const state = { texts: [{ id: 1, content: 'Hi' }], backgroundImageData: 'data:x', snapToGrid: true }
    const result = parseExportedState(serializeStateForExport(state))
    expect(result.texts).toEqual(state.texts)
    expect(result.snapToGrid).toBe(true)
    expect(result.backgroundImageData).toBeUndefined()
    expect(result.version).toBeUndefined()
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
