import { describe, it, expect } from 'vitest'
import { SHAPE_TYPES, DEFAULT_SHAPE, isShapeType, createShape, ellipseGeometry, trianglePoints, cornerRadius, lineEndpoints } from '../src/lib/shapes'

describe('SHAPE_TYPES / isShapeType', () => {
  it('contains rect, circle, triangle, and line', () => {
    expect(SHAPE_TYPES).toEqual(['rect', 'circle', 'triangle', 'line'])
  })

  it('validates types', () => {
    expect(isShapeType('rect')).toBe(true)
    expect(isShapeType('circle')).toBe(true)
    expect(isShapeType('triangle')).toBe(true)
    expect(isShapeType('line')).toBe(true)
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

  it('applies line-specific defaults: strokeWidth 4 and height 0', () => {
    const line = createShape(5, 'line')
    expect(line.type).toBe('line')
    expect(line.strokeWidth).toBe(4)
    expect(line.height).toBe(0)
  })

  it('lets overrides win over line-specific defaults', () => {
    const line = createShape(6, 'line', { strokeWidth: 8, height: 100 })
    expect(line.strokeWidth).toBe(8)
    expect(line.height).toBe(100)
  })
})

describe('lineEndpoints', () => {
  it('returns start at (x, y) and end at (x+width, y+height)', () => {
    expect(lineEndpoints({ x: 10, y: 20, width: 100, height: 50 })).toEqual({ x1: 10, y1: 20, x2: 110, y2: 70 })
  })

  it('handles a horizontal line (height 0)', () => {
    expect(lineEndpoints({ x: 50, y: 100, width: 200, height: 0 })).toEqual({ x1: 50, y1: 100, x2: 250, y2: 100 })
  })

  it('handles a negative delta (line going up-left from start)', () => {
    expect(lineEndpoints({ x: 300, y: 300, width: -100, height: -100 })).toEqual({ x1: 300, y1: 300, x2: 200, y2: 200 })
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
