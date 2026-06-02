import { describe, it, expect } from 'vitest'
import { TEMPLATES, TEXT_KEYS, getTemplate, instantiateTemplate } from '../src/lib/templates'

// A simple incrementing id factory, like the editor's nextId counter.
const counter = (start = 1) => {
  let n = start
  return () => n++
}

describe('TEMPLATES definitions', () => {
  it('expose unique ids and human names', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0)
    const ids = TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TEMPLATES) {
      expect(typeof t.name).toBe('string')
      expect(t.name.length).toBeGreaterThan(0)
    }
  })

  it('include the layouts named in the spec', () => {
    const ids = TEMPLATES.map(t => t.id)
    expect(ids).toEqual(expect.arrayContaining(['title-artist', 'minimal', 'grid-art']))
  })

  it('give every text layer the full set of editable keys', () => {
    for (const t of TEMPLATES) {
      for (const text of t.layout.texts) {
        for (const key of TEXT_KEYS) {
          expect(text, `${t.id} text missing ${key}`).toHaveProperty(key)
        }
      }
      expect(t.layout.grid).toMatchObject({
        enabled: expect.any(Boolean),
        spacing: expect.any(Number),
        majorEvery: expect.any(Number),
      })
      expect(typeof t.layout.snapToGrid).toBe('boolean')
    }
  })
})

describe('getTemplate', () => {
  it('finds a template by id', () => {
    expect(getTemplate('minimal')).toBe(TEMPLATES.find(t => t.id === 'minimal'))
  })

  it('returns undefined for an unknown id', () => {
    expect(getTemplate('nope')).toBeUndefined()
  })
})

describe('instantiateTemplate', () => {
  const baseState = {
    backgroundImage: 'cover.jpg',
    backgroundImageData: 'data:image/png;base64,AAAA',
    texts: [{ id: 99, content: 'old' }],
    grid: { enabled: true, spacing: 10, majorEvery: 2 },
    snapToGrid: false,
  }

  it('preserves the current background image', () => {
    const out = instantiateTemplate(getTemplate('title-artist'), baseState, counter())
    expect(out.backgroundImage).toBe('cover.jpg')
    expect(out.backgroundImageData).toBe('data:image/png;base64,AAAA')
  })

  it('replaces texts with the template layers and assigns fresh unique ids', () => {
    const template = getTemplate('title-artist')
    const out = instantiateTemplate(template, baseState, counter(50))
    expect(out.texts).toHaveLength(template.layout.texts.length)
    expect(out.texts.map(t => t.content)).toEqual(['Playlist Title', 'Artist or Curator'])
    const ids = out.texts.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([50, 51])
  })

  it('applies the template grid and snap settings', () => {
    const out = instantiateTemplate(getTemplate('grid-art'), baseState, counter())
    expect(out.grid).toEqual({ enabled: true, spacing: 40, majorEvery: 4 })
    expect(out.snapToGrid).toBe(true)
  })

  it('produces an empty layout for the blank template', () => {
    const out = instantiateTemplate(getTemplate('blank'), baseState, counter())
    expect(out.texts).toEqual([])
  })

  it('does not mutate the template definition or share references with it', () => {
    const template = getTemplate('grid-art')
    const before = JSON.parse(JSON.stringify(template))
    const out = instantiateTemplate(template, baseState, counter())
    out.texts[0].content = 'changed'
    out.grid.spacing = 999
    expect(template).toEqual(before)
    expect(out.grid).not.toBe(template.layout.grid)
  })
})
