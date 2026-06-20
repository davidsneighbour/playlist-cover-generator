/**
 * @module align
 * @description Pure geometry helpers for aligning a single layer to the canvas.
 * All alignments are relative to the canvas bounding box (0,0)–(canvasWidth,canvasHeight).
 *
 * Text layers carry no width/height in state; pass the layer as-is and the
 * helpers use 0 for missing dimensions, which aligns the anchor point.
 */

// Compute the new { x, y } after aligning a layer to the canvas.
// `alignment` is one of: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export function alignLayer(layer, canvasWidth, canvasHeight, alignment) {
  const w = layer.width ?? 0
  const h = layer.height ?? 0
  switch (alignment) {
    case 'left':   return { x: 0,                                      y: layer.y }
    case 'center': return { x: Math.round((canvasWidth  - w) / 2),     y: layer.y }
    case 'right':  return { x: canvasWidth  - w,                       y: layer.y }
    case 'top':    return { x: layer.x,   y: 0 }
    case 'middle': return { x: layer.x,   y: Math.round((canvasHeight - h) / 2) }
    case 'bottom': return { x: layer.x,   y: canvasHeight - h }
    default:       return { x: layer.x,   y: layer.y }
  }
}
