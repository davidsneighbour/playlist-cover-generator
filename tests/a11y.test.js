import { describe, it, expect } from 'vitest'
import { layerNoun, actionAnnouncement, describeLayer } from '../src/lib/a11y'

describe('layerNoun', () => {
  it('names each layer kind', () => {
    expect(layerNoun('text')).toBe('Text layer')
    expect(layerNoun('image')).toBe('Image layer')
    expect(layerNoun('shape')).toBe('Shape')
  })

  it('falls back to a generic noun', () => {
    expect(layerNoun('whatever')).toBe('Layer')
  })
})

describe('actionAnnouncement', () => {
  it('builds add/delete/duplicate messages per kind', () => {
    expect(actionAnnouncement('add', 'text')).toBe('Text layer added')
    expect(actionAnnouncement('delete', 'image')).toBe('Image layer deleted')
    expect(actionAnnouncement('duplicate', 'shape')).toBe('Shape duplicated')
  })

  it('returns the noun for an unknown action', () => {
    expect(actionAnnouncement('frobnicate', 'text')).toBe('Text layer')
  })
})

describe('describeLayer', () => {
  it('includes text content', () => {
    expect(describeLayer('text', { content: 'Hello' })).toBe('Text layer: Hello')
    expect(describeLayer('text', { content: '' })).toBe('Text layer: empty')
  })

  it('includes the image name', () => {
    expect(describeLayer('image', { name: 'logo.png' })).toBe('Image layer: logo.png')
    expect(describeLayer('image', {})).toBe('Image layer: image')
  })

  it('names shapes by type', () => {
    expect(describeLayer('shape', { type: 'circle' })).toBe('Circle shape')
    expect(describeLayer('shape', { type: 'rect' })).toBe('Rectangle shape')
  })
})
