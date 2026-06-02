import { describe, it, expect } from 'vitest'
import {
  CANVAS_PRESETS,
  DEFAULT_EXPORT_SIZE,
  exportScale,
  clampExportSize,
} from '../src/lib/canvas'

describe('CANVAS_PRESETS', () => {
  it('includes the documented square sizes', () => {
    const sizes = CANVAS_PRESETS.map(p => p.size)
    expect(sizes).toContain(600)
    expect(sizes).toContain(1000)
    expect(sizes).toContain(3000)
  })

  it('gives every preset a unique id and a label', () => {
    const ids = CANVAS_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(CANVAS_PRESETS.every(p => typeof p.label === 'string' && p.label.length > 0)).toBe(true)
  })

  it('names the streaming platforms', () => {
    const labels = CANVAS_PRESETS.map(p => p.label).join(' ')
    expect(labels).toMatch(/Spotify/)
    expect(labels).toMatch(/Apple Music/)
  })
})

describe('DEFAULT_EXPORT_SIZE', () => {
  it('defaults to the native 600 canvas', () => {
    expect(DEFAULT_EXPORT_SIZE).toBe(600)
  })
})

describe('exportScale', () => {
  it('is 1 at the native size', () => {
    expect(exportScale(600, 600)).toBe(1)
  })

  it('scales up and down proportionally', () => {
    expect(exportScale(3000, 600)).toBe(5)
    expect(exportScale(300, 600)).toBe(0.5)
  })

  it('falls back to 1 for invalid input', () => {
    expect(exportScale(0, 600)).toBe(1)
    expect(exportScale('x', 600)).toBe(1)
  })
})

describe('clampExportSize', () => {
  it('passes through an in-range integer', () => {
    expect(clampExportSize(1000)).toBe(1000)
  })

  it('rounds to whole pixels', () => {
    expect(clampExportSize(999.6)).toBe(1000)
  })

  it('clamps to the min and max', () => {
    expect(clampExportSize(1)).toBe(16)
    expect(clampExportSize(99999)).toBe(8000)
  })

  it('falls back to the default for non-numbers', () => {
    expect(clampExportSize('nope')).toBe(DEFAULT_EXPORT_SIZE)
    expect(clampExportSize(undefined)).toBe(DEFAULT_EXPORT_SIZE)
  })
})
