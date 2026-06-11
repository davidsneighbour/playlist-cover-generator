/**
 * @module grid
 * @description Snap a coordinate to the nearest grid line when snapping is enabled.
 * Spacing is in canvas units. Shared by the drag hook and the layer-add handlers
 * so rounding behaves identically everywhere.
 */
export function snapValue(value, spacing, enabled) {
  if (!enabled) return value
  return Math.round(value / spacing) * spacing
}
