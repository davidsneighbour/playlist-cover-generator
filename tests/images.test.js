import { describe, it, expect } from 'vitest'
import {
  BLEND_MODES,
  DEFAULT_IMAGE_LAYER,
  createImageLayer,
  clampOpacity,
  isValidBlendMode,
  fitDimensions,
  centeredPosition,
  coverDimensions,
  scaleDimensions,
  dimensionPercent,
  aspectHeight,
  aspectWidth,
  offCanvasBounds,
  resizeFromCorner,
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

  it('returns negative offsets for a box larger than the canvas', () => {
    expect(centeredPosition(600, 1200, 600)).toEqual({ x: -300, y: 0 })
  })
})

describe('coverDimensions', () => {
  it('fills the shorter side and overflows the longer (landscape)', () => {
    // 800x400 over 600: shorter side 400 -> scale 1.5 -> 1200x600
    expect(coverDimensions(800, 400, 600)).toEqual({ width: 1200, height: 600 })
  })

  it('fills the shorter side and overflows the longer (portrait)', () => {
    expect(coverDimensions(400, 800, 600)).toEqual({ width: 600, height: 1200 })
  })

  it('returns a square for a square image', () => {
    expect(coverDimensions(500, 500, 600)).toEqual({ width: 600, height: 600 })
  })

  it('falls back to the canvas size when dimensions are unknown', () => {
    expect(coverDimensions(0, 0, 600)).toEqual({ width: 600, height: 600 })
  })
})

describe('scaleDimensions', () => {
  it('scales to a percentage of the natural size', () => {
    expect(scaleDimensions(400, 200, 50)).toEqual({ width: 200, height: 100 })
  })

  it('never goes below 1px', () => {
    expect(scaleDimensions(400, 200, 0)).toEqual({ width: 1, height: 1 })
  })
})

describe('dimensionPercent', () => {
  it('reports the current width as a percentage of natural', () => {
    expect(dimensionPercent(200, 400)).toBe(50)
  })

  it('returns 100 when natural width is unknown', () => {
    expect(dimensionPercent(200, null)).toBe(100)
  })
})

describe('aspectHeight / aspectWidth', () => {
  it('keeps the natural ratio', () => {
    expect(aspectHeight(300, 400, 200)).toBe(150)
    expect(aspectWidth(150, 400, 200)).toBe(300)
  })

  it('returns null when natural dimensions are unknown', () => {
    expect(aspectHeight(300, null, null)).toBeNull()
    expect(aspectWidth(150, null, null)).toBeNull()
  })
})

describe('offCanvasBounds', () => {
  it('lets a box go off any edge but keeps a margin on-canvas', () => {
    expect(offCanvasBounds(200, 100, 600, 24)).toEqual({
      minX: -176,
      minY: -76,
      maxX: 576,
      maxY: 576,
    })
  })
})

describe('resizeFromCorner', () => {
  it('sizes from a fixed top-left toward the pointer', () => {
    expect(resizeFromCorner(0, 0, 100, 50)).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('repositions when dragging past the fixed corner (fixed bottom-right)', () => {
    expect(resizeFromCorner(100, 100, 0, 0)).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('locks the aspect ratio when requested', () => {
    const box = resizeFromCorner(0, 0, 100, 10, { ratio: 2, lockAspect: true })
    expect(box.width / box.height).toBe(2)
    expect(box).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('keeps the fixed corner fixed while locking aspect to the left/up', () => {
    // fixed bottom-right at (100,100), pointer up-left; ratio 1
    const box = resizeFromCorner(100, 100, 0, 20, { ratio: 1, lockAspect: true })
    expect(box.width).toBe(box.height)
    expect(box.x + box.width).toBe(100)
    expect(box.y + box.height).toBe(100)
  })

  it('enforces a minimum size', () => {
    expect(resizeFromCorner(0, 0, 0, 0, { min: 8 })).toMatchObject({ width: 8, height: 8 })
  })
})
