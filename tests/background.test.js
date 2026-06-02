import { describe, it, expect } from 'vitest'
import {
  BACKGROUND_GRADIENT_TYPES,
  DEFAULT_BACKGROUND_GRADIENT,
  isBackgroundGradientType,
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
