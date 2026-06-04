import { describe, it, expect } from 'vitest'
import { snapValue } from '../src/lib/grid'

describe('snapValue', () => {
  it('returns the value unchanged when snapping is disabled', () => {
    expect(snapValue(37, 20, false)).toBe(37)
    expect(snapValue(0, 20, false)).toBe(0)
  })

  it('rounds to the nearest multiple of the spacing when enabled', () => {
    expect(snapValue(37, 20, true)).toBe(40)
    expect(snapValue(29, 20, true)).toBe(20)
    expect(snapValue(30, 20, true)).toBe(40) // round half up
    expect(snapValue(50, 25, true)).toBe(50)
  })

  it('handles negative coordinates', () => {
    expect(snapValue(-9, 20, true)).toBe(-0)
    expect(snapValue(-11, 20, true)).toBe(-20)
  })
})
