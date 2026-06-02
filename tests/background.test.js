import { describe, it, expect } from 'vitest'
import {
  BACKGROUND_GRADIENT_TYPES,
  DEFAULT_BACKGROUND_GRADIENT,
  isBackgroundGradientType,
  DEFAULT_BACKGROUND_TRANSFORM,
  backgroundCrop,
} from '../src/lib/background'

describe('BACKGROUND_GRADIENT_TYPES', () => {
  it('offers linear and radial', () => {
    expect(BACKGROUND_GRADIENT_TYPES).toEqual(['linear', 'radial'])
  })
})

describe('DEFAULT_BACKGROUND_GRADIENT', () => {
  it('is disabled and linear by default', () => {
    expect(DEFAULT_BACKGROUND_GRADIENT.enabled).toBe(false)
    expect(DEFAULT_BACKGROUND_GRADIENT.type).toBe('linear')
  })

  it('carries two colors and an angle', () => {
    expect(DEFAULT_BACKGROUND_GRADIENT).toMatchObject({
      color: expect.any(String),
      color2: expect.any(String),
      angle: expect.any(Number),
    })
  })
})

describe('isBackgroundGradientType', () => {
  it('accepts known types and rejects others', () => {
    expect(isBackgroundGradientType('linear')).toBe(true)
    expect(isBackgroundGradientType('radial')).toBe(true)
    expect(isBackgroundGradientType('solid')).toBe(false)
    expect(isBackgroundGradientType('')).toBe(false)
  })
})

describe('DEFAULT_BACKGROUND_TRANSFORM', () => {
  it('is cover-sized and centered', () => {
    expect(DEFAULT_BACKGROUND_TRANSFORM).toEqual({ zoom: 1, panX: 0.5, panY: 0.5 })
  })
})

describe('backgroundCrop', () => {
  it('fills the canvas exactly for a square image at zoom 1', () => {
    expect(backgroundCrop(1000, 1000, 600, DEFAULT_BACKGROUND_TRANSFORM)).toEqual({ x: 0, y: 0, width: 600, height: 600 })
  })

  it('covers and centers a wide image (overflow split evenly)', () => {
    // 1200x600 cover at canvas 600 -> 1200x600; centered x = (600-1200)/2 = -300
    expect(backgroundCrop(1200, 600, 600, { zoom: 1, panX: 0.5, panY: 0.5 })).toEqual({ x: -300, y: 0, width: 1200, height: 600 })
  })

  it('pans within the overflow (0 = left edge, 1 = right edge)', () => {
    expect(backgroundCrop(1200, 600, 600, { panX: 0 }).x).toBe(0)
    expect(backgroundCrop(1200, 600, 600, { panX: 1 }).x).toBe(-600)
  })

  it('zooms about the cover size', () => {
    expect(backgroundCrop(600, 600, 600, { zoom: 2, panX: 0.5, panY: 0.5 })).toEqual({ x: -300, y: -300, width: 1200, height: 1200 })
  })

  it('clamps zoom below 1 up to 1 (no gaps)', () => {
    expect(backgroundCrop(600, 600, 600, { zoom: 0.5 })).toMatchObject({ width: 600, height: 600 })
  })

  it('clamps pan outside 0..1', () => {
    expect(backgroundCrop(1200, 600, 600, { panX: -5 }).x).toBe(0)
    expect(backgroundCrop(1200, 600, 600, { panX: 5 }).x).toBe(-600)
  })
})
