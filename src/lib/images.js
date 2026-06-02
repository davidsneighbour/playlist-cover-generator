// Pure helpers for stacked image layers (logos, overlays) placed over the
// background. Layer order in the `images` array is the paint order: index 0 is
// drawn first (lowest), the last item on top. The generic reorder helpers in
// layers.js work on these objects too, since they key off `id`.

// CSS mix-blend-mode values offered for image layers.
export const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]

export const DEFAULT_IMAGE_LAYER = {
  x: 200,
  y: 200,
  width: 200,
  height: 200,
  opacity: 1,
  blendMode: 'normal',
}

// Build an image layer with defaults, allowing any field to be overridden.
export function createImageLayer(id, { name = '', data = null, ...overrides } = {}) {
  return { id, name, data, ...DEFAULT_IMAGE_LAYER, ...overrides }
}

// Clamp an opacity to the 0..1 range, falling back to 1 for non-numbers.
export function clampOpacity(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 1
  return Math.min(1, Math.max(0, n))
}

export function isValidBlendMode(mode) {
  return BLEND_MODES.includes(mode)
}

// Scale a natural width/height so the longest side equals maxSide, preserving
// aspect ratio. Falls back to a square box when dimensions are unknown.
export function fitDimensions(naturalWidth, naturalHeight, maxSide) {
  if (!naturalWidth || !naturalHeight) return { width: maxSide, height: maxSide }
  const scale = maxSide / Math.max(naturalWidth, naturalHeight)
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  }
}

// Top-left position that centers a box of the given size on a square canvas.
export function centeredPosition(canvasSize, width, height) {
  return {
    x: Math.round((canvasSize - width) / 2),
    y: Math.round((canvasSize - height) / 2),
  }
}
