import { describe, it, expect } from 'vitest'
import {
  BUILTIN_FONTS,
  normalizeFontName,
  googleFontCssUrl,
  parseFontFaces,
  buildFontFaceRule,
  addFont,
} from '../src/lib/fonts'

describe('BUILTIN_FONTS', () => {
  it('is a non-empty list of unique names', () => {
    expect(BUILTIN_FONTS.length).toBeGreaterThan(0)
    expect(new Set(BUILTIN_FONTS).size).toBe(BUILTIN_FONTS.length)
  })
})

describe('normalizeFontName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeFontName('  Open   Sans ')).toBe('Open Sans')
  })

  it('handles nullish input', () => {
    expect(normalizeFontName(undefined)).toBe('')
    expect(normalizeFontName(null)).toBe('')
  })
})

describe('googleFontCssUrl', () => {
  it('builds a weights-only URL with + for spaces', () => {
    expect(googleFontCssUrl('Open Sans')).toBe(
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap'
    )
  })

  it('builds the ital,wght axis when italics are requested', () => {
    expect(googleFontCssUrl('Roboto', { italics: true })).toBe(
      'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap'
    )
  })

  it('dedupes and sorts weights', () => {
    expect(googleFontCssUrl('Inter', { weights: [700, 400, 400] })).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
    )
  })
})

describe('parseFontFaces', () => {
  const css = `
    /* latin */
    @font-face {
      font-family: 'Open Sans';
      font-style: normal;
      font-weight: 400;
      src: url(https://fonts.gstatic.com/s/opensans/v1/a.woff2) format('woff2');
    }
    @font-face {
      font-family: 'Open Sans';
      font-style: italic;
      font-weight: 700;
      src: url(https://fonts.gstatic.com/s/opensans/v1/b.woff2) format('woff2');
    }
  `

  it('extracts each face url, weight, style, and format', () => {
    const faces = parseFontFaces(css)
    expect(faces).toHaveLength(2)
    expect(faces[0]).toEqual({
      url: 'https://fonts.gstatic.com/s/opensans/v1/a.woff2',
      weight: '400',
      style: 'normal',
      format: 'woff2',
    })
    expect(faces[1]).toMatchObject({ weight: '700', style: 'italic' })
  })

  it('returns an empty list when there are no font faces', () => {
    expect(parseFontFaces('body { color: red; }')).toEqual([])
  })

  it('defaults weight and style when a block omits them', () => {
    const minimal = `@font-face { src: url(https://x/y.woff2) format('woff2'); }`
    expect(parseFontFaces(minimal)[0]).toMatchObject({ weight: '400', style: 'normal' })
  })
})

describe('buildFontFaceRule', () => {
  it('produces a self-contained @font-face rule', () => {
    const rule = buildFontFaceRule('Open Sans', {
      url: 'data:font/woff2;base64,AAAA',
      weight: '700',
      style: 'italic',
      format: 'woff2',
    })
    expect(rule).toBe(
      "@font-face{font-family:'Open Sans';font-style:italic;font-weight:700;src:url(data:font/woff2;base64,AAAA) format('woff2');}"
    )
  })

  it('applies sensible defaults', () => {
    const rule = buildFontFaceRule('Inter', { url: 'data:font/woff2;base64,BBBB' })
    expect(rule).toContain('font-weight:400')
    expect(rule).toContain('font-style:normal')
  })
})

describe('addFont', () => {
  it('appends a normalized name', () => {
    expect(addFont(['Arial'], '  Open  Sans ')).toEqual(['Arial', 'Open Sans'])
  })

  it('returns the same reference for an empty name', () => {
    const list = ['Arial']
    expect(addFont(list, '   ')).toBe(list)
  })

  it('returns the same reference for a duplicate', () => {
    const list = ['Open Sans']
    expect(addFont(list, 'Open Sans')).toBe(list)
  })
})
