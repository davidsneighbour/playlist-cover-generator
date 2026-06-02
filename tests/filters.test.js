import { describe, it, expect } from 'vitest'
import { DEFAULT_FILTERS, isFilterActive, brightnessContrastTransfer } from '../src/lib/filters'

describe('DEFAULT_FILTERS', () => {
  it('is neutral (no visible effect)', () => {
    expect(DEFAULT_FILTERS).toEqual({ brightness: 1, contrast: 1, saturate: 1, blur: 0 })
  })
})

describe('isFilterActive', () => {
  it('is false for the defaults or nullish input', () => {
    expect(isFilterActive(DEFAULT_FILTERS)).toBe(false)
    expect(isFilterActive(null)).toBe(false)
  })

  it('is true when any value changes', () => {
    expect(isFilterActive({ ...DEFAULT_FILTERS, brightness: 1.2 })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_FILTERS, contrast: 0.8 })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_FILTERS, saturate: 0 })).toBe(true)
    expect(isFilterActive({ ...DEFAULT_FILTERS, blur: 3 })).toBe(true)
  })
})

describe('brightnessContrastTransfer', () => {
  it('is identity at the neutral values', () => {
    expect(brightnessContrastTransfer(1, 1)).toEqual({ slope: 1, intercept: 0 })
  })

  it('treats brightness as a pure multiply', () => {
    expect(brightnessContrastTransfer(1.5, 1)).toEqual({ slope: 1.5, intercept: 0 })
  })

  it('pivots contrast around 0.5', () => {
    expect(brightnessContrastTransfer(1, 2)).toEqual({ slope: 2, intercept: -0.5 })
    expect(brightnessContrastTransfer(1, 0.5)).toEqual({ slope: 0.5, intercept: 0.25 })
  })

  it('composes brightness then contrast', () => {
    expect(brightnessContrastTransfer(2, 2)).toEqual({ slope: 4, intercept: -0.5 })
  })

  it('falls back to neutral for non-numbers', () => {
    expect(brightnessContrastTransfer(undefined, 'x')).toEqual({ slope: 1, intercept: 0 })
  })
})
