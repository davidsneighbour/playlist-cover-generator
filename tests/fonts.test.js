import { describe, it, expect } from 'vitest'
import {
  BUILTIN_FONTS,
  normalizeFontName,
  googleFontCssUrl,
  parseFontFaces,
  buildFontFaceRule,
  addFont,
  googleFontsListUrl,
  parseFontFamilies,
  filterFontNames,
  fontVariantKey,
  variantFontFace,
  pickVariantFile,
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

describe('googleFontsListUrl', () => {
  it('builds the catalog URL with an encoded key and sort', () => {
    expect(googleFontsListUrl('a b&c')).toBe(
      'https://www.googleapis.com/webfonts/v1/webfonts?key=a%20b%26c&sort=popularity'
    )
  })
})

describe('parseFontFamilies', () => {
  it('extracts family names from an API response', () => {
    expect(parseFontFamilies({ items: [{ family: 'Roboto' }, { family: 'Inter' }] })).toEqual(['Roboto', 'Inter'])
  })

  it('handles missing or empty items', () => {
    expect(parseFontFamilies({})).toEqual([])
    expect(parseFontFamilies(null)).toEqual([])
  })
})

describe('filterFontNames', () => {
  const names = ['Roboto', 'Roboto Slab', 'Slabo 27px', 'Open Sans', 'Rob8 Mono']

  it('returns nothing for an empty query', () => {
    expect(filterFontNames(names, '  ')).toEqual([])
  })

  it('ranks prefix matches above substring matches, case-insensitively', () => {
    expect(filterFontNames(names, 'rob')).toEqual(['Roboto', 'Roboto Slab', 'Rob8 Mono'])
  })

  it('matches substrings too', () => {
    expect(filterFontNames(names, 'slab')).toEqual(['Slabo 27px', 'Roboto Slab'])
  })

  it('respects the limit', () => {
    expect(filterFontNames(names, 'o', 2)).toHaveLength(2)
  })
})

describe('fontVariantKey', () => {
  it('maps bold/italic to Google variant keys', () => {
    expect(fontVariantKey(false, false)).toBe('regular')
    expect(fontVariantKey(true, false)).toBe('700')
    expect(fontVariantKey(false, true)).toBe('italic')
    expect(fontVariantKey(true, true)).toBe('700italic')
  })
})

describe('variantFontFace', () => {
  it('maps variant keys to css weight/style', () => {
    expect(variantFontFace('regular')).toEqual({ weight: '400', style: 'normal' })
    expect(variantFontFace('italic')).toEqual({ weight: '400', style: 'italic' })
    expect(variantFontFace('700')).toEqual({ weight: '700', style: 'normal' })
    expect(variantFontFace('700italic')).toEqual({ weight: '700', style: 'italic' })
  })
})

describe('pickVariantFile', () => {
  const files = { regular: 'r.ttf', '700': 'b.ttf', italic: 'i.ttf' }

  it('returns the exact variant when present', () => {
    expect(pickVariantFile(files, '700')).toBe('b.ttf')
  })

  it('falls back to regular when the variant is missing', () => {
    expect(pickVariantFile({ regular: 'r.ttf' }, '700italic')).toBe('r.ttf')
  })

  it('falls back to any file when there is no regular', () => {
    expect(pickVariantFile({ '500': 'm.ttf' }, '700')).toBe('m.ttf')
  })

  it('returns null for empty input', () => {
    expect(pickVariantFile(null, 'regular')).toBeNull()
  })
})
