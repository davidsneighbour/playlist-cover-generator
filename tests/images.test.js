import { describe, it, expect } from 'vitest'
import {
  BLEND_MODES,
  DEFAULT_IMAGE_LAYER,
  createImageLayer,
  clampOpacity,
  isValidBlendMode,
  fitDimensions,
  centeredPosition,
} from '../src/lib/images'

describe('BLEND_MODES', () => {
  it('includes normal and common modes, all unique', () => {
    expect(BLEND_MODES).toContain('normal')
    expect(BLEND_MODES).toContain('multiply')
    expect(BLEND_MODES).toContain('screen')
    expect(new Set(BLEND_MODES).size).toBe(BLEND_MODES.length)
  })
})

describe('createImageLayer', () => {
  it('applies defaults and the given id, name, and data', () => {
    const layer = createImageLayer(5, { name: 'logo.png', data: 'data:...' })
    expect(layer).toEqual({ id: 5, name: 'logo.png', data: 'data:...', ...DEFAULT_IMAGE_LAYER })
  })

  it('lets overrides win over defaults', () => {
    const layer = createImageLayer(1, { data: 'd', width: 50, height: 60, opacity: 0.5, blendMode: 'screen', x: 10, y: 20 })
    expect(layer).toMatchObject({ width: 50, height: 60, opacity: 0.5, blendMode: 'screen', x: 10, y: 20 })
  })

  it('defaults name and data when omitted', () => {
    const layer = createImageLayer(2)
    expect(layer.name).toBe('')
    expect(layer.data).toBeNull()
  })
})

describe('clampOpacity', () => {
  it('clamps into the 0..1 range', () => {
    expect(clampOpacity(-0.5)).toBe(0)
    expect(clampOpacity(2)).toBe(1)
    expect(clampOpacity(0.4)).toBe(0.4)
  })

  it('falls back to 1 for non-numbers', () => {
    expect(clampOpacity('nope')).toBe(1)
    expect(clampOpacity(undefined)).toBe(1)
  })
})

describe('isValidBlendMode', () => {
  it('accepts known modes and rejects others', () => {
    expect(isValidBlendMode('multiply')).toBe(true)
    expect(isValidBlendMode('wat')).toBe(false)
  })
})

describe('fitDimensions', () => {
  it('scales the longest side to maxSide, preserving aspect (landscape)', () => {
    expect(fitDimensions(400, 200, 240)).toEqual({ width: 240, height: 120 })
  })

  it('scales the longest side to maxSide, preserving aspect (portrait)', () => {
    expect(fitDimensions(100, 300, 240)).toEqual({ width: 80, height: 240 })
  })

  it('returns a square box when dimensions are unknown', () => {
    expect(fitDimensions(0, 0, 240)).toEqual({ width: 240, height: 240 })
  })
})

describe('centeredPosition', () => {
  it('centers a box on the canvas', () => {
    expect(centeredPosition(600, 200, 100)).toEqual({ x: 200, y: 250 })
  })
})
