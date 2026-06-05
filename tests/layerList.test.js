import { describe, it, expect } from 'vitest'
import { buildLayerList } from '../src/lib/layerList'

const kinds = (entries) => entries.map(e => e.kind).join(',')

describe('buildLayerList', () => {
  it('always lists the overlay and background singletons, even when empty', () => {
    const list = buildLayerList({})
    expect(kinds(list)).toBe('overlay,background')
    const overlay = list.find(e => e.kind === 'overlay')
    const background = list.find(e => e.kind === 'background')
    expect(overlay.muted).toBe(true)
    expect(background.muted).toBe(true)
    expect(background.label).toBe('No background')
  })

  it('orders entries front to back: text, shapes, images, overlay, background', () => {
    const state = {
      texts: [{ id: 1, content: 'A' }],
      shapes: [{ id: 2, type: 'rect' }],
      images: [{ id: 3, name: 'logo.png' }],
    }
    expect(kinds(buildLayerList(state))).toBe('text,shape,image,overlay,background')
  })

  it('lists text layers front-most first with their content as the label', () => {
    const state = { texts: [{ id: 1, content: 'back' }, { id: 2, content: 'front' }] }
    const texts = buildLayerList(state).filter(e => e.kind === 'text')
    expect(texts.map(t => t.label)).toEqual(['front', 'back'])
    expect(texts.map(t => t.id)).toEqual([2, 1])
  })

  it('falls back to a placeholder label for blank text', () => {
    const list = buildLayerList({ texts: [{ id: 1, content: '   ' }] })
    expect(list[0].label).toBe('(empty text)')
  })

  it('labels and icons shapes by type', () => {
    const state = { shapes: [{ id: 1, type: 'rect' }, { id: 2, type: 'circle' }] }
    const shapes = buildLayerList(state).filter(e => e.kind === 'shape')
    // front-most first: circle (id 2) then rect (id 1)
    expect(shapes.map(s => s.label)).toEqual(['Circle', 'Rectangle'])
    expect(shapes.map(s => s.icon)).toEqual(['circle', 'square'])
  })

  it('uses the image name, defaulting to "Image"', () => {
    const list = buildLayerList({ images: [{ id: 1 }] })
    expect(list[0].label).toBe('Image')
  })

  it('reflects the selected layer of each kind', () => {
    const state = {
      texts: [{ id: 1, content: 'T' }],
      shapes: [{ id: 2, type: 'rect' }],
      images: [{ id: 3, name: 'i' }],
    }
    const list = buildLayerList(state, { selectedTextId: 1, selectedImageId: 3, selectedShapeId: 2 })
    expect(list.filter(e => e.selected).map(e => e.kind).sort()).toEqual(['image', 'shape', 'text'])
  })

  it('shows the image filename for the background and is not muted', () => {
    const list = buildLayerList({ backgroundImage: 'cover.jpg' })
    const bg = list.find(e => e.kind === 'background')
    expect(bg.label).toBe('cover.jpg')
    expect(bg.muted).toBe(false)
  })

  it('falls back to the gradient label when only a gradient is set', () => {
    const list = buildLayerList({ backgroundGradient: { enabled: true } })
    const bg = list.find(e => e.kind === 'background')
    expect(bg.label).toBe('Gradient background')
    expect(bg.muted).toBe(false)
  })

  it('marks the overlay as not muted when enabled', () => {
    const list = buildLayerList({ overlay: { enabled: true } })
    expect(list.find(e => e.kind === 'overlay').muted).toBe(false)
  })

  it('carries hidden and locked flags for each layer, defaulting to false', () => {
    const state = {
      texts: [{ id: 1, content: 'T', hidden: true }],
      shapes: [{ id: 2, type: 'rect', locked: true }],
      images: [{ id: 3, name: 'i' }],
    }
    const list = buildLayerList(state)
    const text = list.find(e => e.kind === 'text')
    const shape = list.find(e => e.kind === 'shape')
    const image = list.find(e => e.kind === 'image')
    expect(text).toMatchObject({ hidden: true, locked: false, muted: true })
    expect(shape).toMatchObject({ hidden: false, locked: true, muted: false })
    expect(image).toMatchObject({ hidden: false, locked: false, muted: false })
  })
})
