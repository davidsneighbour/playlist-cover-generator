// Pure helpers for the gradient background: a two-stop linear or radial gradient
// that fills the canvas beneath the background image (so it shows when no image
// is loaded). The gradient-axis math is shared with the overlay (`gradientVector`
// in overlay.js); this module only holds the defaults and the type guard.

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
