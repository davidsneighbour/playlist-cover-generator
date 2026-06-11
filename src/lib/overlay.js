/**
 * @module overlay
 * @description Pure helpers for the color overlay: a full-canvas fill painted over the
 * background image (but under the other layers) to improve text legibility.
 * It is either a solid color or a two-stop linear/radial gradient. The network
 * and DOM-free math here — chiefly the gradient direction — is what we unit-test;
 * the rendering lives in the component.
 */

// Overlay fill kinds.
export const OVERLAY_TYPES = ['solid', 'linear', 'radial']

export const DEFAULT_OVERLAY = {
  enabled: false,
  type: 'solid',
  color: '#000000',
  opacity: 0.4,
  color2: '#000000',
  opacity2: 0,
  angle: 0,
  blendMode: 'normal',
}

export function isOverlayType(type) {
  return OVERLAY_TYPES.includes(type)
}

// Endpoints of a linear-gradient axis for a given angle, in objectBoundingBox
// units (0..1) so they apply to any canvas size. The angle is the direction the
// gradient travels, in degrees, measured clockwise from straight down:
// 0 = top to bottom, 90 = left to right, 180 = bottom to top, 270 = right to left.
// Endpoints sit on the unit box's inscribed circle, which is plenty for an
// overlay and keeps the math exact.
export function gradientVector(angleDeg) {
  const r = ((Number(angleDeg) || 0) * Math.PI) / 180
  const dx = Math.sin(r)
  const dy = Math.cos(r)
  const round = n => Math.round(n * 1e6) / 1e6
  return {
    x1: round(0.5 - dx / 2),
    y1: round(0.5 - dy / 2),
    x2: round(0.5 + dx / 2),
    y2: round(0.5 + dy / 2),
  }
}
