import { describe, it, expect } from 'vitest'
import { textStrokeAttrs, textShadowFilter, DEFAULT_STROKE_COLOR, DEFAULT_SHADOW_COLOR } from '../src/lib/text'

describe('textStrokeAttrs', () => {
  it('returns no stroke when strokeWidth is 0', () => {
    expect(textStrokeAttrs({ strokeWidth: 0, stroke: '#ff0000' })).toEqual({ stroke: 'none', strokeWidth: 0 })
  })

  it('returns no stroke when strokeWidth is missing', () => {
    expect(textStrokeAttrs({})).toEqual({ stroke: 'none', strokeWidth: 0 })
  })

  it('returns no stroke for negative widths', () => {
    expect(textStrokeAttrs({ strokeWidth: -3 })).toEqual({ stroke: 'none', strokeWidth: 0 })
  })

  it('returns no stroke for a non-numeric width', () => {
    expect(textStrokeAttrs({ strokeWidth: 'abc', stroke: '#000' })).toEqual({ stroke: 'none', strokeWidth: 0 })
  })

  it('paints the stroke under the fill with rounded joins when enabled', () => {
    expect(textStrokeAttrs({ strokeWidth: 4, stroke: '#112233' })).toEqual({
      stroke: '#112233',
      strokeWidth: 4,
      paintOrder: 'stroke',
      strokeLinejoin: 'round',
    })
  })

  it('falls back to the default color when a width is set but no color', () => {
    expect(textStrokeAttrs({ strokeWidth: 2 }).stroke).toBe(DEFAULT_STROKE_COLOR)
  })

  it('coerces a numeric-string width', () => {
    const out = textStrokeAttrs({ strokeWidth: '3', stroke: '#abcdef' })
    expect(out.strokeWidth).toBe(3)
    expect(out.paintOrder).toBe('stroke')
  })
})

describe('textShadowFilter', () => {
  it('returns null when there is no shadow', () => {
    expect(textShadowFilter({ id: 1 })).toBeNull()
    expect(textShadowFilter({ id: 1, shadow: null })).toBeNull()
  })

  it('resolves filter parameters and a stable id from the layer id', () => {
    const out = textShadowFilter({ id: 7, shadow: { color: '#222222', blur: 5, dx: 3, dy: 4 } })
    expect(out).toEqual({ id: 'shadow-7', dx: 3, dy: 4, stdDeviation: 5, color: '#222222' })
  })

  it('falls back to the default shadow color', () => {
    expect(textShadowFilter({ id: 2, shadow: { blur: 2 } }).color).toBe(DEFAULT_SHADOW_COLOR)
  })

  it('clamps a negative blur to zero', () => {
    expect(textShadowFilter({ id: 3, shadow: { blur: -8 } }).stdDeviation).toBe(0)
  })

  it('defaults missing offsets to zero and coerces numeric strings', () => {
    const out = textShadowFilter({ id: 4, shadow: { blur: '6', dx: '2' } })
    expect(out).toMatchObject({ dx: 2, dy: 0, stdDeviation: 6 })
  })
})
