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
  naturalWidth: null,
  naturalHeight: null,
  lockAspect: true,
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
// May be negative when the box is larger than the canvas (a "cover" image).
export function centeredPosition(canvasSize, width, height) {
  return {
    x: Math.round((canvasSize - width) / 2),
    y: Math.round((canvasSize - height) / 2),
  }
}

// Scale natural dimensions so the image *covers* the square canvas: the shorter
// side fills it and the longer side overflows (the inverse of fitDimensions).
export function coverDimensions(naturalWidth, naturalHeight, canvasSize) {
  if (!naturalWidth || !naturalHeight) return { width: canvasSize, height: canvasSize }
  const scale = canvasSize / Math.min(naturalWidth, naturalHeight)
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  }
}

// Size at a percentage of the natural dimensions (never below 1px).
export function scaleDimensions(naturalWidth, naturalHeight, percent) {
  return {
    width: Math.max(1, Math.round((naturalWidth * percent) / 100)),
    height: Math.max(1, Math.round((naturalHeight * percent) / 100)),
  }
}

// Current width as a percentage of the natural width (100 when unknown).
export function dimensionPercent(width, naturalWidth) {
  if (!naturalWidth) return 100
  return Math.round((width / naturalWidth) * 100)
}

// The height/width that keeps the natural aspect ratio for a given other side.
export function aspectHeight(width, naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight) return null
  return Math.max(1, Math.round((width * naturalHeight) / naturalWidth))
}

export function aspectWidth(height, naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight) return null
  return Math.max(1, Math.round((height * naturalWidth) / naturalHeight))
}

// How far a margin should stay on-canvas so a box layer can be dragged off any
// edge without being lost entirely.
export const OFFCANVAS_MARGIN = 24

// Drag bounds for a box layer's top-left corner: it may go off any edge as long
// as `margin` pixels remain on the canvas.
export function offCanvasBounds(width, height, canvasSize, margin = OFFCANVAS_MARGIN) {
  return {
    minX: margin - width,
    minY: margin - height,
    maxX: canvasSize - margin,
    maxY: canvasSize - margin,
  }
}
