// Pure helpers for the background: the gradient fill (a two-stop linear or
// radial gradient shown beneath the image) and the image crop/pan/zoom geometry.
// The gradient-axis math is shared with the overlay (`gradientVector` in
// overlay.js); the crop reuses `coverDimensions` from images.js.

import { coverDimensions } from './images'

export const BACKGROUND_GRADIENT_TYPES = ['linear', 'radial']

export const DEFAULT_BACKGROUND_GRADIENT = {
  enabled: false,
  type: 'linear',
  color: '#2563eb',
  color2: '#7c3aed',
  angle: 0,
}

export function isBackgroundGradientType(type) {
  return BACKGROUND_GRADIENT_TYPES.includes(type)
}

// How the background image is cropped within the square frame. zoom is a
// multiple of the cover size (1 = cover, the old `xMidYMid slice` behavior);
// panX/panY are 0..1 (0.5 = centered, 0 = left/top edge, 1 = right/bottom edge).
export const DEFAULT_BACKGROUND_TRANSFORM = { zoom: 1, panX: 0.5, panY: 0.5 }

function clamp01(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return 0.5
  return Math.min(1, Math.max(0, v))
}

// Round to a whole number, normalizing -0 to 0 (e.g. for a centered pan with no
// overflow) so callers and tests see a plain 0.
function roundCoord(n) {
  const r = Math.round(n)
  return r === 0 ? 0 : r
}

// Position and size (in canvas units) for the background image so it covers the
// canvas at the given zoom and pan. zoom is clamped to >= 1 and pan to 0..1, so
// the image always covers the frame with no gaps. Use with
// preserveAspectRatio="none" since the returned width/height already keep the
// image's aspect ratio. Pass separate canvasWidth and canvasHeight for non-square.
export function backgroundCrop(naturalWidth, naturalHeight, canvasWidth, canvasHeight, { zoom = 1, panX = 0.5, panY = 0.5 } = {}) {
  const base = coverDimensions(naturalWidth, naturalHeight, canvasWidth, canvasHeight)
  const z = Math.max(1, Number(zoom) || 1)
  const width = Math.round(base.width * z)
  const height = Math.round(base.height * z)
  return {
    x: roundCoord((canvasWidth - width) * clamp01(panX)),
    y: roundCoord((canvasHeight - height) * clamp01(panY)),
    width,
    height,
  }
}
