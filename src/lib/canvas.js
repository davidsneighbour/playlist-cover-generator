// Canvas/export-size presets. The editor's internal coordinate space is a fixed
// 600-unit square (CANVAS_SIZE) and all geometry is stored in those units; these
// presets only set the pixel size of the exported PNG and the width/height of
// the exported SVG. Every target is square, matching the editor and the
// streaming platforms' cover-art specs.

export const CANVAS_PRESETS = [
  { id: 'px600', label: '600 × 600', size: 600 },
  { id: 'px1000', label: '1000 × 1000', size: 1000 },
  { id: 'px3000', label: '3000 × 3000 (high-res)', size: 3000 },
  { id: 'spotify', label: 'Spotify — 3000 × 3000', size: 3000 },
  { id: 'apple', label: 'Apple Music — 3000 × 3000', size: 3000 },
]

export const DEFAULT_EXPORT_SIZE = 600

// Factor to scale the 600-unit canvas up (or down) to the export pixel size.
// Falls back to 1 for nonsensical input so an export never collapses to 0.
export function exportScale(exportSize, canvasSize) {
  const s = Number(exportSize) / Number(canvasSize)
  return Number.isFinite(s) && s > 0 ? s : 1
}

// Clamp an export size to a sane pixel range, rounding to a whole pixel. Guards
// against bad values from imported JSON or a manual edit.
export function clampExportSize(value, { min = 16, max = 8000 } = {}) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_EXPORT_SIZE
  return Math.min(max, Math.max(min, n))
}
