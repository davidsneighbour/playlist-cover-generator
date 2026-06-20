import { describe, it, expect } from 'vitest'
import { alignLayer } from '../src/lib/align'

const CW = 600
const CH = 600

describe('alignLayer', () => {
  const box = { x: 100, y: 150, width: 200, height: 100 }

  it('left: sets x to 0, keeps y', () => {
    expect(alignLayer(box, CW, CH, 'left')).toEqual({ x: 0, y: 150 })
  })

  it('center: centers horizontally, keeps y', () => {
    expect(alignLayer(box, CW, CH, 'center')).toEqual({ x: 200, y: 150 })
  })

  it('right: aligns right edge to canvas right, keeps y', () => {
    expect(alignLayer(box, CW, CH, 'right')).toEqual({ x: 400, y: 150 })
  })

  it('top: sets y to 0, keeps x', () => {
    expect(alignLayer(box, CW, CH, 'top')).toEqual({ x: 100, y: 0 })
  })

  it('middle: centers vertically, keeps x', () => {
    expect(alignLayer(box, CW, CH, 'middle')).toEqual({ x: 100, y: 250 })
  })

  it('bottom: aligns bottom edge to canvas bottom, keeps x', () => {
    expect(alignLayer(box, CW, CH, 'bottom')).toEqual({ x: 100, y: 500 })
  })

  it('unknown alignment: returns current position unchanged', () => {
    expect(alignLayer(box, CW, CH, 'unknown')).toEqual({ x: 100, y: 150 })
  })

  it('text layer without width/height: aligns anchor point', () => {
    const text = { x: 300, y: 200 }
    expect(alignLayer(text, CW, CH, 'center')).toEqual({ x: 300, y: 200 })
    expect(alignLayer(text, CW, CH, 'left')).toEqual({ x: 0, y: 200 })
    expect(alignLayer(text, CW, CH, 'middle')).toEqual({ x: 300, y: 300 })
  })

  it('non-square canvas', () => {
    const layer = { x: 0, y: 0, width: 100, height: 50 }
    expect(alignLayer(layer, 800, 400, 'center')).toEqual({ x: 350, y: 0 })
    expect(alignLayer(layer, 800, 400, 'middle')).toEqual({ x: 0, y: 175 })
  })
})
