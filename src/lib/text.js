// Pure helpers for text-layer presentation.

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
