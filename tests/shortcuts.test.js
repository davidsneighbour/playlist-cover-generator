import { describe, it, expect } from 'vitest'
import { SHORTCUTS, formatKeys, nudgeDelta, isDeleteKey, isEditableTarget } from '../src/lib/shortcuts'

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

describe('nudgeDelta', () => {
  it('maps arrow keys to unit deltas (down is +y)', () => {
    expect(nudgeDelta('ArrowLeft')).toEqual([-1, 0])
    expect(nudgeDelta('ArrowRight')).toEqual([1, 0])
    expect(nudgeDelta('ArrowUp')).toEqual([0, -1])
    expect(nudgeDelta('ArrowDown')).toEqual([0, 1])
  })

  it('scales by the step', () => {
    expect(nudgeDelta('ArrowRight', 20)).toEqual([20, 0])
    expect(nudgeDelta('ArrowUp', 20)).toEqual([0, -20])
  })

  it('returns null for non-arrow keys', () => {
    expect(nudgeDelta('Enter')).toBeNull()
    expect(nudgeDelta('a', 20)).toBeNull()
  })
})

describe('isDeleteKey', () => {
  it('matches Delete and Backspace', () => {
    expect(isDeleteKey('Delete')).toBe(true)
    expect(isDeleteKey('Backspace')).toBe(true)
  })

  it('rejects other keys', () => {
    expect(isDeleteKey('d')).toBe(false)
    expect(isDeleteKey('ArrowUp')).toBe(false)
  })
})

describe('isEditableTarget', () => {
  it('matches text-editing controls', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true)
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('rejects non-editable elements and missing targets', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false)
    expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isEditableTarget({ tagName: 'svg' })).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget(undefined)).toBe(false)
  })
})
