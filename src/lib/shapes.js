// Pure helpers for shape primitives (rectangles and circles/ellipses). Shapes
// share the same bounding-box model as image layers (x, y, width, height), so
// dragging and snapping are identical, and they live in their own `shapes`
// array whose order is paint order.

export const SHAPE_TYPES = ['rect', 'circle']

export const DEFAULT_SHAPE = {
  x: 220,
  y: 220,
  width: 160,
  height: 160,
  fill: '#3b82f6',
  stroke: '#000000',
  strokeWidth: 0,
  opacity: 1,
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
