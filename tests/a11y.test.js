import { describe, it, expect } from 'vitest'
import { layerNoun, actionAnnouncement } from '../src/lib/a11y'

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
