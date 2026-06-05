// Pure helpers for text-layer presentation.

// Default line-height (as a multiple of the font size) for multi-line text.
export const DEFAULT_LINE_HEIGHT = 1.2

// Split a text layer's content into its individual lines. Newlines (\n) in the
// content become separate lines, each rendered as its own <tspan>. Always
// returns at least one entry so a single-line layer renders unchanged.
export function textLines(text) {
  return String(text?.content ?? '').split('\n')
}

// Line-height as a multiple of the font size, used as the per-line `dy` (in em).
// Falls back to the default for missing or non-positive values.
export function lineHeightEm(text) {
  const lh = Number(text?.lineHeight)
  return Number.isFinite(lh) && lh > 0 ? lh : DEFAULT_LINE_HEIGHT
}

// Default outline color used when a layer turns on a stroke without picking one.
export const DEFAULT_STROKE_COLOR = '#000000'

// SVG presentation attributes for a text layer's outline.
//
// Returns no-stroke attributes when strokeWidth is missing or <= 0. When a
// stroke is present, `paintOrder` is set to "stroke" so the outline is painted
// *under* the fill (a true outline that does not eat into the letterforms), and
// joins are rounded for clean corners. The result is spread directly onto the
// SVG <text> element and is also valid in exported SVG.
export function textStrokeAttrs(text) {
  const width = Number(text?.strokeWidth) || 0
  if (width <= 0) {
    return { stroke: 'none', strokeWidth: 0 }
  }
  return {
    stroke: text.stroke || DEFAULT_STROKE_COLOR,
    strokeWidth: width,
    paintOrder: 'stroke',
    strokeLinejoin: 'round',
  }
}

// Default drop-shadow color used when a layer enables a shadow without a color.
export const DEFAULT_SHADOW_COLOR = '#000000'

// Resolved parameters for a text layer's drop shadow, or null when the layer has
// no shadow. `text.shadow` is null/undefined when off, otherwise an object with
// { color, blur, dx, dy }. The result drives an SVG <filter><feDropShadow>,
// which renders in browsers and stays editable in other SVG tools. blur maps to
// the Gaussian stdDeviation and is clamped to be non-negative.
export function textShadowFilter(text) {
  const shadow = text?.shadow
  if (!shadow) return null
  return {
    id: `shadow-${text.id}`,
    dx: Number(shadow.dx) || 0,
    dy: Number(shadow.dy) || 0,
    stdDeviation: Math.max(0, Number(shadow.blur) || 0),
    color: shadow.color || DEFAULT_SHADOW_COLOR,
  }
}

