import { describe, it, expect } from 'vitest'
import { textStrokeAttrs, DEFAULT_STROKE_COLOR } from '../src/lib/text'

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
