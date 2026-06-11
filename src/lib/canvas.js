// Canvas/export-size helpers. The editor's internal coordinate space uses
// canvasWidth × canvasHeight (both stored in state), so each template can have
// its own aspect ratio. These presets define common export pixel sizes for the
// square (music cover) use case; non-square templates store their native export
// dimensions in their template definition.

export const CANVAS_PRESETS = [
  { id: 'px600', label: '600 × 600', size: 600, width: 600, height: 600 },
  { id: 'px1000', label: '1000 × 1000', size: 1000, width: 1000, height: 1000 },
  { id: 'px3000', label: '3000 × 3000 (high-res)', size: 3000, width: 3000, height: 3000 },
  { id: 'spotify', label: 'Spotify — 3000 × 3000', size: 3000, width: 3000, height: 3000 },
  { id: 'apple', label: 'Apple Music — 3000 × 3000', size: 3000, width: 3000, height: 3000 },
]

export const DEFAULT_EXPORT_SIZE = 600
export const DEFAULT_EXPORT_WIDTH = 600
export const DEFAULT_EXPORT_HEIGHT = 600

// Factor to scale one canvas dimension up (or down) to the export pixel size.
// Falls back to 1 for nonsensical input so an export never collapses to 0.
export function exportScale(exportDim, canvasDim) {
  const s = Number(exportDim) / Number(canvasDim)
  return Number.isFinite(s) && s > 0 ? s : 1
}

// Clamp an export dimension to a sane pixel range, rounding to a whole pixel.
// Guards against bad values from imported JSON or a manual edit.
export function clampExportSize(value, { min = 16, max = 8000 } = {}) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_EXPORT_SIZE
  return Math.min(max, Math.max(min, n))
}
