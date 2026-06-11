import { describe, it, expect } from 'vitest'
import { buildStateFromTemplate } from '../src/lib/templateApi'
import { TEMPLATES, getTemplate } from '../src/lib/templates'

describe('buildStateFromTemplate', () => {
  it('throws for an unknown template id', () => {
    expect(() => buildStateFromTemplate('no-such-template')).toThrow('Unknown template')
  })

  it('accepts a template object directly', () => {
    const template = getTemplate('blank')
    const state = buildStateFromTemplate(template)
    expect(state).toMatchObject({ canvasWidth: 600, canvasHeight: 600 })
  })

  it('returns a complete state with all required keys', () => {
    const state = buildStateFromTemplate('blank')
    expect(state).toMatchObject({
      backgroundImage: null,
      backgroundImageData: null,
      texts: expect.any(Array),
      images: expect.any(Array),
      shapes: expect.any(Array),
      overlay: expect.any(Object),
      grid: expect.any(Object),
      canvasWidth: expect.any(Number),
      canvasHeight: expect.any(Number),
      exportWidth: expect.any(Number),
      exportHeight: expect.any(Number),
    })
  })

  it('applies canvas and export dimensions from the template', () => {
    const state = buildStateFromTemplate('social-post')
    expect(state.canvasWidth).toBe(1080)
    expect(state.canvasHeight).toBe(566)
    expect(state.exportWidth).toBe(1080)
    expect(state.exportHeight).toBe(566)
  })

  it('applies the template overlay when defined', () => {
    const state = buildStateFromTemplate('social-post')
    expect(state.overlay.enabled).toBe(true)
    expect(state.overlay.type).toBe('linear')
  })

  it('assigns unique ids to text layers', () => {
    const state = buildStateFromTemplate('title-artist')
    expect(state.texts.length).toBe(2)
    expect(state.texts[0].id).toBeDefined()
    expect(state.texts[0].id).not.toBe(state.texts[1].id)
  })

  it('applies backgroundImageData input', () => {
    const state = buildStateFromTemplate('social-post', { backgroundImageData: 'data:image/png;base64,abc' })
    expect(state.backgroundImageData).toBe('data:image/png;base64,abc')
  })

  it('maps named text field inputs to text layer content', () => {
    const state = buildStateFromTemplate('social-post', { label: 'MUSIC', title: 'Summer Playlist' })
    expect(state.texts[0].content).toBe('MUSIC')
    expect(state.texts[1].content).toBe('Summer Playlist')
  })

  it('maps named text fields for social-square', () => {
    const state = buildStateFromTemplate('social-square', { label: 'HI', title: 'World' })
    expect(state.texts[0].content).toBe('HI')
    expect(state.texts[1].content).toBe('World')
  })

  it('ignores unknown field names without error', () => {
    expect(() => buildStateFromTemplate('social-post', { unknown: 'x' })).not.toThrow()
  })

  it('returns independent state objects on repeated calls', () => {
    const a = buildStateFromTemplate('social-post', { title: 'A' })
    const b = buildStateFromTemplate('social-post', { title: 'B' })
    expect(a.texts[1].content).toBe('A')
    expect(b.texts[1].content).toBe('B')
  })

  it('does not mutate the template data on repeated calls', () => {
    buildStateFromTemplate('title-artist', {})
    const state = buildStateFromTemplate('title-artist', {})
    const tpl = getTemplate('title-artist')
    expect(tpl.layout.texts[0].id).toBeUndefined()
    expect(state.texts[0].id).toBeDefined()
  })

  it('covers every template without throwing', () => {
    for (const tpl of TEMPLATES) {
      expect(() => buildStateFromTemplate(tpl)).not.toThrow()
    }
  })
})
