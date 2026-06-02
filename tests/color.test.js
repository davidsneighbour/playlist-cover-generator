import { describe, it, expect } from 'vitest'
import { relativeLuminance, averageRgb, pickContrastColor } from '../src/lib/color'

describe('relativeLuminance', () => {
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1)
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0)
  })

  it('weights green more than blue', () => {
    const green = relativeLuminance({ r: 0, g: 255, b: 0 })
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 })
    expect(green).toBeGreaterThan(blue)
  })
})

describe('averageRgb', () => {
  it('averages opaque pixels', () => {
    // two pixels: black and white, both opaque
    const data = [0, 0, 0, 255, 255, 255, 255, 255]
    expect(averageRgb(data)).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('ignores fully transparent pixels', () => {
    // opaque red + transparent black -> average is the red
    const data = [255, 0, 0, 255, 0, 0, 0, 0]
    expect(averageRgb(data)).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('falls back to white when everything is transparent', () => {
    expect(averageRgb([0, 0, 0, 0])).toEqual({ r: 255, g: 255, b: 255 })
  })
})

describe('pickContrastColor', () => {
  it('returns dark text on a light background', () => {
    expect(pickContrastColor({ r: 255, g: 255, b: 255 })).toBe('#111827')
  })

  it('returns light text on a dark background', () => {
    expect(pickContrastColor({ r: 20, g: 20, b: 20 })).toBe('#ffffff')
  })
})
