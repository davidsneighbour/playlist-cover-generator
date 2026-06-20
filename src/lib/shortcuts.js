/**
 * @module shortcuts
 * @description Keyboard shortcuts shown in the help overlay. Kept as data plus a pure,
 * platform-aware formatter so the list and its rendering are unit-tested; the
 * modal and the actual key handling live in the component. The `mod` token
 * stands for the primary modifier (Cmd on macOS, Ctrl elsewhere).
 */

export const SHORTCUTS = [
  { id: 'undo', keys: ['mod', 'Z'], description: 'Undo' },
  { id: 'redo', keys: ['mod', 'Shift', 'Z'], description: 'Redo' },
  { id: 'redo-alt', keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
  { id: 'delete', keys: ['Delete'], description: 'Delete the selected layer' },
  { id: 'zorder-up', keys: ['Ctrl', ']'], description: 'Move selected layer one step forward' },
  { id: 'zorder-down', keys: ['Ctrl', '['], description: 'Move selected layer one step back' },
  { id: 'nudge', keys: ['↑', '↓', '←', '→'], description: 'Nudge the selected layer by 1px' },
  { id: 'nudge-grid', keys: ['Shift', '↑↓←→'], description: 'Nudge by the grid spacing' },
  { id: 'help', keys: ['F1'], description: 'Open or close this help' },
]

// Expand a key combo for display, turning the 'mod' token into the platform's
// primary modifier. Returns an array of labels so each can render as its own
// <kbd>.
export function formatKeys(keys, isMac = false) {
  return keys.map(k => (k === 'mod' ? (isMac ? 'Cmd' : 'Ctrl') : k))
}

// Movement deltas for the arrow keys, scaled by `step`. Returns [dx, dy] in
// canvas units, or null for any other key. Down is +y to match SVG coordinates.
const ARROW_DELTAS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export function nudgeDelta(key, step = 1) {
  const d = ARROW_DELTAS[key]
  return d ? [d[0] * step, d[1] * step] : null
}

// Whether a key should delete the selected layer.
export function isDeleteKey(key) {
  return key === 'Delete' || key === 'Backspace'
}

// Whether an event target is a text-editing control, where editor shortcuts
// (undo/redo, delete, nudge) must defer to native behavior. Guards the global
// keydown handlers so typing in a field is never hijacked.
export function isEditableTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
}
