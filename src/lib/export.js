// Export helpers for turning the live editor SVG into portable output.
// Kept DOM-light so the invariants can be unit-tested.

// Editor-only elements that must never appear in exported PNG/SVG: the snap grid
// and the selection outline/handles. Both carry a `data-layer` marker.
export const EXPORT_STRIP_SELECTOR = '[data-layer="grid"], [data-layer="selection"]'

// Remove the editor-only layers from a cloned SVG before serialization or
// rasterization. Mutates and returns the clone so callers can chain.
export function stripExportArtifacts(clone) {
  clone.querySelectorAll(EXPORT_STRIP_SELECTOR).forEach((el) => el.remove())
  return clone
}
