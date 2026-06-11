/**
 * @module fonts
 * @description Font helpers: the built-in picker list plus pure utilities for loading and
 * embedding Google Fonts. The network and DOM work lives in the component; this
 * module only builds URLs and parses/builds CSS, which is what we unit-test.
 */

// Always-available families offered in the picker.
export const BUILTIN_FONTS = [
  'sans-serif',
  'serif',
  'monospace',
  'Georgia',
  'Trebuchet MS',
  'Arial',
  'Verdana',
  'Impact',
  'Times New Roman',
  'Courier New',
]

// Trim and collapse internal whitespace in a user-entered font name.
export function normalizeFontName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ')
}

// Build the Google Fonts CSS2 URL for a family. Spaces in the family become
// '+'. By default we request regular and bold weights (so bold text gets a real
// bold face) and skip the italic axis, because requesting italics for a family
// that has none makes the whole request fail; synthetic italics are used there.
export function googleFontCssUrl(family, { weights = [400, 700], italics = false, display = 'swap' } = {}) {
  const fam = normalizeFontName(family).replace(/ /g, '+')
  const sorted = [...new Set(weights)].sort((a, b) => a - b)
  let axis
  if (italics) {
    const tuples = []
    for (const ital of [0, 1]) {
      for (const w of sorted) tuples.push(`${ital},${w}`)
    }
    axis = `ital,wght@${tuples.join(';')}`
  } else {
    axis = `wght@${sorted.join(';')}`
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:${axis}&display=${display}`
}

// Parse the @font-face blocks of a Google Fonts CSS response into a list of
// { url, weight, style, format } descriptors. @font-face blocks contain no
// nested braces, so a simple block match is sufficient.
export function parseFontFaces(cssText) {
  const faces = []
  const blockRe = /@font-face\s*{([^}]*)}/g
  let match
  while ((match = blockRe.exec(cssText)) !== null) {
    const body = match[1]
    const url = (body.match(/url\(([^)]+)\)/) || [])[1]
    if (!url) continue
    const weight = (body.match(/font-weight:\s*([^;]+);/) || [])[1]
    const style = (body.match(/font-style:\s*([^;]+);/) || [])[1]
    const format = (body.match(/format\(([^)]+)\)/) || [])[1]
    faces.push({
      url: url.replace(/['"]/g, '').trim(),
      weight: weight ? weight.trim() : '400',
      style: style ? style.trim() : 'normal',
      format: format ? format.replace(/['"]/g, '').trim() : 'woff2',
    })
  }
  return faces
}

// Build a single @font-face CSS rule for a family from a face descriptor whose
// `url` is typically a base64 data URI for a self-contained, portable export.
export function buildFontFaceRule(family, { url, weight = '400', style = 'normal', format = 'woff2' }) {
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};src:url(${url}) format('${format}');}`
}

// Add a font name to a list, normalized and de-duplicated. Returns the same list
// reference when the name is empty or already present, so callers can skip no-op
// state updates.
export function addFont(list, name) {
  const normalized = normalizeFontName(name)
  if (!normalized || list.includes(normalized)) return list
  return [...list, normalized]
}

// URL for the Google Fonts Developer API font list (the whole catalog in one
// call; there is no server-side search, so we filter client-side).
export function googleFontsListUrl(apiKey, { sort = 'popularity' } = {}) {
  return `https://www.googleapis.com/webfonts/v1/webfonts?key=${encodeURIComponent(apiKey)}&sort=${sort}`
}

// Family names from a Google Fonts API response.
export function parseFontFamilies(apiResponse) {
  return (apiResponse?.items || []).map(item => item.family).filter(Boolean)
}

// Google Fonts API variant key for a weight/style combination.
export function fontVariantKey(bold, italic) {
  if (bold && italic) return '700italic'
  if (bold) return '700'
  if (italic) return 'italic'
  return 'regular'
}

// CSS font-weight/font-style for a Google Fonts variant key.
export function variantFontFace(variantKey) {
  const italic = variantKey.endsWith('italic')
  const numeric = variantKey.replace('italic', '')
  const weight = !numeric || numeric === 'regular' ? '400' : numeric
  return { weight, style: italic ? 'italic' : 'normal' }
}

// Pick a font-file URL for a variant from an API item's `files` map, falling
// back to the regular face and then to any available file.
export function pickVariantFile(files, variantKey) {
  if (!files) return null
  return files[variantKey] || files.regular || Object.values(files)[0] || null
}

// Typeahead filter over font names: case-insensitive, names starting with the
// query rank above names merely containing it, capped at `limit`.
export function filterFontNames(names, query, limit = 8) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return []
  const starts = []
  const contains = []
  for (const name of names) {
    const lower = name.toLowerCase()
    if (lower.startsWith(q)) starts.push(name)
    else if (lower.includes(q)) contains.push(name)
  }
  return [...starts, ...contains].slice(0, limit)
}
