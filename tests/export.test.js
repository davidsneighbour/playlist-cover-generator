// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { stripExportArtifacts, EXPORT_STRIP_SELECTOR, prepareCloneForExport, clearInteractionStyles, serializeSvgClone, embedFontsInClone } from '../src/lib/export'

function makeSvg() {
  const wrap = document.createElement('div')
  wrap.innerHTML = `
    <svg viewBox="0 0 600 600">
      <defs></defs>
      <image data-layer="background" />
      <text data-text-id="t1">Hello</text>
      <g data-layer="grid"><line /></g>
      <g data-layer="selection"><rect /></g>
    </svg>`
  return wrap.querySelector('svg')
}

describe('stripExportArtifacts', () => {
  it('removes the grid and selection layers', () => {
    const svg = makeSvg()
    stripExportArtifacts(svg)
    expect(svg.querySelector('[data-layer="grid"]')).toBeNull()
    expect(svg.querySelector('[data-layer="selection"]')).toBeNull()
  })

  it('keeps the artwork (background and text)', () => {
    const svg = makeSvg()
    stripExportArtifacts(svg)
    expect(svg.querySelector('[data-layer="background"]')).not.toBeNull()
    expect(svg.querySelector('[data-text-id="t1"]')).not.toBeNull()
  })

  it('returns the same node for chaining', () => {
    const svg = makeSvg()
    expect(stripExportArtifacts(svg)).toBe(svg)
  })

  it('is a no-op when there is nothing to strip', () => {
    const wrap = document.createElement('div')
    wrap.innerHTML = '<svg><text data-text-id="t1">x</text></svg>'
    const svg = wrap.querySelector('svg')
    const before = svg.innerHTML
    stripExportArtifacts(svg)
    expect(svg.innerHTML).toBe(before)
  })

  it('exposes the selector it strips', () => {
    expect(EXPORT_STRIP_SELECTOR).toContain('grid')
    expect(EXPORT_STRIP_SELECTOR).toContain('selection')
  })
})

describe('prepareCloneForExport', () => {
  it('does not mutate the original SVG', () => {
    const svg = makeSvg()
    const before = svg.innerHTML
    prepareCloneForExport(svg, 800, 600)
    expect(svg.innerHTML).toBe(before)
  })

  it('strips editor layers from the clone', () => {
    const clone = prepareCloneForExport(makeSvg(), 800, 600)
    expect(clone.querySelector('[data-layer="grid"]')).toBeNull()
    expect(clone.querySelector('[data-layer="selection"]')).toBeNull()
  })

  it('sets width and height attributes on the clone', () => {
    const clone = prepareCloneForExport(makeSvg(), 1200, 630)
    expect(clone.getAttribute('width')).toBe('1200')
    expect(clone.getAttribute('height')).toBe('630')
  })

  it('keeps artwork in the clone', () => {
    const clone = prepareCloneForExport(makeSvg(), 800, 600)
    expect(clone.querySelector('[data-layer="background"]')).not.toBeNull()
    expect(clone.querySelector('[data-text-id="t1"]')).not.toBeNull()
  })
})

describe('clearInteractionStyles', () => {
  function makeCloneWithStyles() {
    const wrap = document.createElement('div')
    wrap.innerHTML = `
      <svg>
        <text data-text-id="t1" style="cursor:move;user-select:none">Hello</text>
        <rect data-layer="background" style="cursor:default" />
      </svg>`
    return wrap.querySelector('svg')
  }

  it('clears cursor and userSelect on [data-text-id] elements', () => {
    const svg = makeCloneWithStyles()
    clearInteractionStyles(svg)
    const text = svg.querySelector('[data-text-id="t1"]')
    expect(text.style.cursor).toBe('')
    expect(text.style.userSelect).toBe('')
  })

  it('does not affect non-text elements', () => {
    const svg = makeCloneWithStyles()
    clearInteractionStyles(svg)
    const rect = svg.querySelector('[data-layer="background"]')
    expect(rect.style.cursor).toBe('default')
  })

  it('returns the same node for chaining', () => {
    const svg = makeCloneWithStyles()
    expect(clearInteractionStyles(svg)).toBe(svg)
  })
})

describe('serializeSvgClone', () => {
  it('returns a string containing the SVG markup', () => {
    const svg = makeSvg()
    const str = serializeSvgClone(svg)
    expect(typeof str).toBe('string')
    expect(str).toContain('<svg')
  })
})

describe('embedFontsInClone', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('does nothing when no custom fonts are in use', async () => {
    const clone = prepareCloneForExport(makeSvg(), 600, 600)
    const loadCatalog = vi.fn()
    // texts reference only a system font; fonts list is empty
    await embedFontsInClone(clone, [{ fontFamily: 'Arial' }], [], loadCatalog)
    expect(loadCatalog).not.toHaveBeenCalled()
    expect(clone.querySelector('[data-embedded-fonts]')).toBeNull()
  })

  it('does nothing when no text layers use a custom font', async () => {
    const clone = prepareCloneForExport(makeSvg(), 600, 600)
    const loadCatalog = vi.fn()
    // fonts list has "Roboto" but no text layer uses it
    await embedFontsInClone(clone, [{ fontFamily: 'Arial' }], ['Roboto'], loadCatalog)
    expect(loadCatalog).not.toHaveBeenCalled()
    expect(clone.querySelector('[data-embedded-fonts]')).toBeNull()
  })

  it('injects a style element with @font-face rules when fonts are used', async () => {
    const clone = prepareCloneForExport(makeSvg(), 600, 600)

    const fakeArrayBuffer = new Uint8Array([1, 2, 3]).buffer
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeArrayBuffer),
    }))

    const loadCatalog = vi.fn().mockResolvedValue([
      { family: 'Roboto', files: { regular: 'https://fonts.gstatic.com/roboto.ttf' } },
    ])

    await embedFontsInClone(clone, [{ fontFamily: 'Roboto', bold: false, italic: false }], ['Roboto'], loadCatalog)

    const styleEl = clone.querySelector('[data-embedded-fonts]')
    expect(styleEl).not.toBeNull()
    expect(styleEl.tagName.toLowerCase()).toBe('style')
    expect(styleEl.textContent).toContain('@font-face')
    expect(styleEl.textContent).toContain('Roboto')
  })

  it('skips embedding when the font file fetch fails', async () => {
    const clone = prepareCloneForExport(makeSvg(), 600, 600)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const loadCatalog = vi.fn().mockResolvedValue([
      { family: 'Roboto', files: { regular: 'https://fonts.gstatic.com/roboto.ttf' } },
    ])

    await embedFontsInClone(clone, [{ fontFamily: 'Roboto', bold: false, italic: false }], ['Roboto'], loadCatalog)
    expect(clone.querySelector('[data-embedded-fonts]')).toBeNull()
  })
})
