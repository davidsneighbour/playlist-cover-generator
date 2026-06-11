/**
 * @module constants
 * @description Shared editor constants. `CANVAS_SIZE` is the legacy default for the internal
 * SVG coordinate space (600×600 square). New code should use `state.canvasWidth`
 * and `state.canvasHeight` instead; `CANVAS_SIZE` is kept for tests and backward compat.
 */
export const CANVAS_SIZE = 600
export const DEFAULT_CANVAS_WIDTH = 600
export const DEFAULT_CANVAS_HEIGHT = 600
export const RULER = 22 // px thickness of each ruler strip
export const DUP_OFFSET = 16 // canvas units a duplicated layer is shifted so it is visible
export const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
