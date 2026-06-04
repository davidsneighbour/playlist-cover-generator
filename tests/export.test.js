// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { stripExportArtifacts, EXPORT_STRIP_SELECTOR } from '../src/lib/export'

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
