import { describe, it, expect } from 'vitest'
import { SHORTCUTS, formatKeys } from '../src/lib/shortcuts'

describe('SHORTCUTS', () => {
  it('is a non-empty list with unique ids', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0)
    const ids = SHORTCUTS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every entry keys and a description', () => {
    for (const s of SHORTCUTS) {
      expect(Array.isArray(s.keys)).toBe(true)
      expect(s.keys.length).toBeGreaterThan(0)
      expect(typeof s.description).toBe('string')
      expect(s.description.length).toBeGreaterThan(0)
    }
  })

  it('documents F1 for the help overlay', () => {
    expect(SHORTCUTS.some(s => s.keys.includes('F1'))).toBe(true)
  })
})

describe('formatKeys', () => {
  it('expands mod to Ctrl off macOS', () => {
    expect(formatKeys(['mod', 'Z'], false)).toEqual(['Ctrl', 'Z'])
  })

  it('expands mod to Cmd on macOS', () => {
    expect(formatKeys(['mod', 'Shift', 'Z'], true)).toEqual(['Cmd', 'Shift', 'Z'])
  })

  it('leaves non-mod keys untouched', () => {
    expect(formatKeys(['Ctrl', 'Y'], true)).toEqual(['Ctrl', 'Y'])
    expect(formatKeys(['F1'])).toEqual(['F1'])
  })
})
