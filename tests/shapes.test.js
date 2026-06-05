import { describe, it, expect } from 'vitest'
import { SHAPE_TYPES, DEFAULT_SHAPE, isShapeType, createShape, ellipseGeometry, trianglePoints, cornerRadius } from '../src/lib/shapes'

describe('SHAPE_TYPES / isShapeType', () => {
  it('contains rect, circle, and triangle', () => {
    expect(SHAPE_TYPES).toEqual(['rect', 'circle', 'triangle'])
  })

  it('validates types', () => {
    expect(isShapeType('rect')).toBe(true)
    expect(isShapeType('circle')).toBe(true)
    expect(isShapeType('triangle')).toBe(true)
    expect(isShapeType('hexagon')).toBe(false)
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

describe('trianglePoints', () => {
  it('puts the apex at the top-center and the base across the bottom', () => {
    expect(trianglePoints({ x: 0, y: 0, width: 100, height: 60 })).toBe('50,0 0,60 100,60')
  })

  it('respects the bounding-box offset', () => {
    expect(trianglePoints({ x: 10, y: 20, width: 40, height: 40 })).toBe('30,20 10,60 50,60')
  })
})

describe('cornerRadius', () => {
  it('returns 0 for non-rect shapes', () => {
    expect(cornerRadius({ type: 'circle', radius: 20, width: 100, height: 100 })).toBe(0)
    expect(cornerRadius({ type: 'triangle', radius: 20, width: 100, height: 100 })).toBe(0)
  })

  it('returns 0 when no radius is set', () => {
    expect(cornerRadius({ type: 'rect', width: 100, height: 100 })).toBe(0)
    expect(cornerRadius({ type: 'rect', radius: 0, width: 100, height: 100 })).toBe(0)
  })

  it('clamps the radius to half the smaller side', () => {
    expect(cornerRadius({ type: 'rect', radius: 80, width: 100, height: 40 })).toBe(20)
    expect(cornerRadius({ type: 'rect', radius: 10, width: 100, height: 100 })).toBe(10)
  })
})
