import { describe, it, expect } from 'vitest'
import { OVERLAY_TYPES, DEFAULT_OVERLAY, isOverlayType, gradientVector } from '../src/lib/overlay'

describe('OVERLAY_TYPES', () => {
  it('offers solid plus the two gradient kinds', () => {
    expect(OVERLAY_TYPES).toEqual(['solid', 'linear', 'radial'])
  })
})

describe('DEFAULT_OVERLAY', () => {
  it('is disabled and solid by default', () => {
    expect(DEFAULT_OVERLAY.enabled).toBe(false)
    expect(DEFAULT_OVERLAY.type).toBe('solid')
  })

  it('carries colors, opacities, angle, and a blend mode', () => {
    expect(DEFAULT_OVERLAY).toMatchObject({
      color: expect.any(String),
      color2: expect.any(String),
      opacity: expect.any(Number),
      opacity2: expect.any(Number),
      angle: expect.any(Number),
      blendMode: 'normal',
    })
  })
})

describe('isOverlayType', () => {
  it('accepts known types and rejects others', () => {
    expect(isOverlayType('solid')).toBe(true)
    expect(isOverlayType('linear')).toBe(true)
    expect(isOverlayType('radial')).toBe(true)
    expect(isOverlayType('conic')).toBe(false)
    expect(isOverlayType('')).toBe(false)
  })
})

describe('gradientVector', () => {
  it('maps 0 degrees to a top-to-bottom axis', () => {
    expect(gradientVector(0)).toEqual({ x1: 0.5, y1: 0, x2: 0.5, y2: 1 })
  })

  it('maps 90 degrees to a left-to-right axis', () => {
    expect(gradientVector(90)).toEqual({ x1: 0, y1: 0.5, x2: 1, y2: 0.5 })
  })

  it('maps 180 degrees to a bottom-to-top axis', () => {
    expect(gradientVector(180)).toEqual({ x1: 0.5, y1: 1, x2: 0.5, y2: 0 })
  })

  it('maps 270 degrees to a right-to-left axis', () => {
    expect(gradientVector(270)).toEqual({ x1: 1, y1: 0.5, x2: 0, y2: 0.5 })
  })

  it('keeps endpoints within the unit box for any angle', () => {
    for (let a = 0; a < 360; a += 15) {
      const v = gradientVector(a)
      for (const k of ['x1', 'y1', 'x2', 'y2']) {
        expect(v[k]).toBeGreaterThanOrEqual(0)
        expect(v[k]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('defaults a non-numeric angle to 0', () => {
    expect(gradientVector(undefined)).toEqual(gradientVector(0))
    expect(gradientVector(NaN)).toEqual(gradientVector(0))
  })
})
