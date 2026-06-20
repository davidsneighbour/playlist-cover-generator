import { describe, it, expect } from 'vitest'
import { reorder, bringToFront, sendToBack, moveUp, moveDown, displayIndexToArrayIndex, duplicateById } from '../src/lib/layers'

// Helper: build a layer list of objects with ids a, b, c, ... and read it back as a string.
const make = (...ids) => ids.map(id => ({ id, content: id.toUpperCase() }))
const ids = (layers) => layers.map(l => l.id).join('')

describe('reorder', () => {
  it('moves an item later in the array (toward the front)', () => {
    expect(ids(reorder(make('a', 'b', 'c'), 0, 2))).toBe('bca')
  })

  it('moves an item earlier in the array (toward the back)', () => {
    expect(ids(reorder(make('a', 'b', 'c'), 2, 0))).toBe('cab')
  })

  it('moves an item by a single step', () => {
    expect(ids(reorder(make('a', 'b', 'c'), 1, 2))).toBe('acb')
  })

  it('returns the same reference when from === to (no-op)', () => {
    const layers = make('a', 'b', 'c')
    expect(reorder(layers, 1, 1)).toBe(layers)
  })

  it('returns the same reference for out-of-bounds indices', () => {
    const layers = make('a', 'b', 'c')
    expect(reorder(layers, -1, 1)).toBe(layers)
    expect(reorder(layers, 1, 5)).toBe(layers)
    expect(reorder(layers, 9, 0)).toBe(layers)
  })

  it('does not mutate the input array', () => {
    const layers = make('a', 'b', 'c')
    reorder(layers, 0, 2)
    expect(ids(layers)).toBe('abc')
  })

  it('preserves length and membership', () => {
    const out = reorder(make('a', 'b', 'c', 'd'), 3, 1)
    expect(out).toHaveLength(4)
    expect(ids(out).split('').sort().join('')).toBe('abcd')
  })
})

describe('bringToFront', () => {
  it('moves a middle layer to the end (front)', () => {
    expect(ids(bringToFront(make('a', 'b', 'c'), 'a'))).toBe('bca')
  })

  it('returns the same reference when already at the front', () => {
    const layers = make('a', 'b', 'c')
    expect(bringToFront(layers, 'c')).toBe(layers)
  })

  it('returns the same reference when the id is not found', () => {
    const layers = make('a', 'b', 'c')
    expect(bringToFront(layers, 'z')).toBe(layers)
  })

  it('does not mutate the input', () => {
    const layers = make('a', 'b', 'c')
    bringToFront(layers, 'a')
    expect(ids(layers)).toBe('abc')
  })
})

describe('sendToBack', () => {
  it('moves a middle layer to the start (back)', () => {
    expect(ids(sendToBack(make('a', 'b', 'c'), 'c'))).toBe('cab')
  })

  it('returns the same reference when already at the back', () => {
    const layers = make('a', 'b', 'c')
    expect(sendToBack(layers, 'a')).toBe(layers)
  })

  it('returns the same reference when the id is not found', () => {
    const layers = make('a', 'b', 'c')
    expect(sendToBack(layers, 'z')).toBe(layers)
  })

  it('does not mutate the input', () => {
    const layers = make('a', 'b', 'c')
    sendToBack(layers, 'c')
    expect(ids(layers)).toBe('abc')
  })
})

describe('moveUp', () => {
  it('moves a layer one step toward the front', () => {
    expect(ids(moveUp(make('a', 'b', 'c'), 'a'))).toBe('bac')
  })

  it('moves the middle layer one step up', () => {
    expect(ids(moveUp(make('a', 'b', 'c'), 'b'))).toBe('acb')
  })

  it('returns the same reference when already at the front', () => {
    const layers = make('a', 'b', 'c')
    expect(moveUp(layers, 'c')).toBe(layers)
  })

  it('returns the same reference when id is not found', () => {
    const layers = make('a', 'b', 'c')
    expect(moveUp(layers, 'z')).toBe(layers)
  })
})

describe('moveDown', () => {
  it('moves a layer one step toward the back', () => {
    expect(ids(moveDown(make('a', 'b', 'c'), 'c'))).toBe('acb')
  })

  it('moves the middle layer one step down', () => {
    expect(ids(moveDown(make('a', 'b', 'c'), 'b'))).toBe('bac')
  })

  it('returns the same reference when already at the back', () => {
    const layers = make('a', 'b', 'c')
    expect(moveDown(layers, 'a')).toBe(layers)
  })

  it('returns the same reference when id is not found', () => {
    const layers = make('a', 'b', 'c')
    expect(moveDown(layers, 'z')).toBe(layers)
  })
})

describe('duplicateById', () => {
  const copy = (orig) => ({ ...orig, id: orig.id + '2' })

  it('inserts the copy directly after the original (one step in front)', () => {
    const out = duplicateById(make('a', 'b', 'c'), 'b', copy)
    expect(ids(out)).toBe('abb2c')
    expect(out).toHaveLength(4)
  })

  it('uses makeCopy to build the new item', () => {
    const out = duplicateById(make('a', 'b'), 'a', (o) => ({ ...o, id: 'a2', content: 'COPY' }))
    expect(out[1]).toEqual({ id: 'a2', content: 'COPY' })
  })

  it('duplicates the last item at the end', () => {
    expect(ids(duplicateById(make('a', 'b'), 'b', copy))).toBe('abb2')
  })

  it('returns the same reference when the id is not found', () => {
    const layers = make('a', 'b')
    expect(duplicateById(layers, 'z', copy)).toBe(layers)
  })

  it('does not mutate the input', () => {
    const layers = make('a', 'b')
    duplicateById(layers, 'a', copy)
    expect(ids(layers)).toBe('ab')
  })
})

describe('displayIndexToArrayIndex', () => {
  it('maps the first displayed row to the last (top) array item', () => {
    expect(displayIndexToArrayIndex(3, 0)).toBe(2)
  })

  it('maps the last displayed row to the first (bottom) array item', () => {
    expect(displayIndexToArrayIndex(3, 2)).toBe(0)
  })

  it('is its own inverse', () => {
    const len = 5
    for (let d = 0; d < len; d++) {
      expect(displayIndexToArrayIndex(len, displayIndexToArrayIndex(len, d))).toBe(d)
    }
  })
})
