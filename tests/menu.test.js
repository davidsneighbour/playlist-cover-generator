import { describe, it, expect } from 'vitest'
import { clampMenuPosition } from '../src/lib/menu'

describe('clampMenuPosition', () => {
  it('leaves an in-bounds position unchanged', () => {
    expect(clampMenuPosition(100, 100, 160, 120, 1000, 800)).toEqual({ x: 100, y: 100 })
  })

  it('pulls the menu left/up when it would overflow the right/bottom edge', () => {
    expect(clampMenuPosition(980, 760, 160, 120, 1000, 800)).toEqual({ x: 832, y: 672 })
  })

  it('clamps to the top-left margin when near the origin', () => {
    expect(clampMenuPosition(0, 0, 160, 120, 1000, 800)).toEqual({ x: 8, y: 8 })
  })

  it('honors a custom margin', () => {
    expect(clampMenuPosition(0, 0, 160, 120, 1000, 800, 20)).toEqual({ x: 20, y: 20 })
  })

  it('keeps the corner at the margin when the menu is larger than the viewport', () => {
    expect(clampMenuPosition(50, 50, 400, 400, 300, 300)).toEqual({ x: 8, y: 8 })
  })
})
