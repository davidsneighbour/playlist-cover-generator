import { describe, it, expect } from 'vitest'
import { SHAPE_TYPES, DEFAULT_SHAPE, isShapeType, createShape, ellipseGeometry } from '../src/lib/shapes'

describe('SHAPE_TYPES / isShapeType', () => {
  it('contains rect and circle', () => {
    expect(SHAPE_TYPES).toEqual(['rect', 'circle'])
  })

  it('validates types', () => {
    expect(isShapeType('rect')).toBe(true)
    expect(isShapeType('circle')).toBe(true)
    expect(isShapeType('triangle')).toBe(false)
  })
})

describe('createShape', () => {
  it('applies defaults with the given id and type', () => {
    expect(createShape(3, 'circle')).toEqual({ id: 3, type: 'circle', ...DEFAULT_SHAPE })
  })

  it('falls back to rect for an unknown type', () => {
    expect(createShape(1, 'hexagon').type).toBe('rect')
  })

  it('lets overrides win over defaults', () => {
    const shape = createShape(2, 'rect', { fill: '#ff0000', strokeWidth: 4, width: 50, opacity: 0.5 })
    expect(shape).toMatchObject({ fill: '#ff0000', strokeWidth: 4, width: 50, opacity: 0.5 })
  })
})

describe('ellipseGeometry', () => {
  it('derives center and radii from the bounding box', () => {
    expect(ellipseGeometry({ x: 100, y: 200, width: 80, height: 40 })).toEqual({
      cx: 140,
      cy: 220,
      rx: 40,
      ry: 20,
    })
  })

  it('produces a true circle for a square box', () => {
    const geo = ellipseGeometry({ x: 0, y: 0, width: 100, height: 100 })
    expect(geo.rx).toBe(geo.ry)
  })
})
