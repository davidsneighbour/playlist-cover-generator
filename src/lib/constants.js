// Shared editor constants. CANVAS_SIZE is the fixed internal SVG coordinate
// space; all geometry is stored in these units and scaled to screen pixels at
// render time. Keep new geometry in this space, not in export pixels.
export const CANVAS_SIZE = 600
export const RULER = 22 // px thickness of each ruler strip
export const DUP_OFFSET = 16 // canvas units a duplicated layer is shifted so it is visible
export const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
