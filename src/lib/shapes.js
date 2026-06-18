/**
 * @module shapes
 * @description Pure helpers for shape primitives (rectangles, circles/ellipses, and
 * triangles). Shapes share the same bounding-box model as image layers (x, y, width,
 * height), so dragging and snapping are identical, and they live in their own `shapes`
 * array whose order is paint order.
 */

export const SHAPE_TYPES = ['rect', 'circle', 'triangle']

export const DEFAULT_SHAPE = {
  name: '',
  x: 220,
  y: 220,
  width: 160,
  height: 160,
  fill: '#3b82f6',
  stroke: '#000000',
  strokeWidth: 0,
  opacity: 1,
  radius: 0, // corner radius for rectangles; ignored by other types
}

export function isShapeType(type) {
  return SHAPE_TYPES.includes(type)
}

// Build a shape with defaults. An unknown type falls back to 'rect'.
export function createShape(id, type, overrides = {}) {
  return { id, type: isShapeType(type) ? type : 'rect', ...DEFAULT_SHAPE, ...overrides }
}

// Convert a shape's bounding box into the cx/cy/rx/ry an <ellipse> needs, so a
// "circle" is an ellipse fit to the box (a square box renders a true circle).
export function ellipseGeometry(shape) {
  return {
    cx: shape.x + shape.width / 2,
    cy: shape.y + shape.height / 2,
    rx: shape.width / 2,
    ry: shape.height / 2,
  }
}

// SVG `points` for a triangle fit to the box: apex at the top-center, base
// across the bottom edge. Returned as the "x,y x,y x,y" string a <polygon> uses.
export function trianglePoints(shape) {
  const { x, y, width, height } = shape
  const apex = `${x + width / 2},${y}`
  const bl = `${x},${y + height}`
  const br = `${x + width},${y + height}`
  return `${apex} ${bl} ${br}`
}

// Corner radius for a rectangle, clamped so it never exceeds half the smaller
// side (an over-large radius otherwise renders oddly). Non-rects get 0.
export function cornerRadius(shape) {
  if (shape.type !== 'rect') return 0
  const r = Number(shape.radius) || 0
  if (r <= 0) return 0
  return Math.min(r, Math.min(shape.width, shape.height) / 2)
}
