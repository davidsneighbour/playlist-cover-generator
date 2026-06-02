// Keyboard shortcuts shown in the help overlay. Kept as data plus a pure,
// platform-aware formatter so the list and its rendering are unit-tested; the
// modal and the actual key handling live in the component. The 'mod' token
// stands for the primary modifier (Cmd on macOS, Ctrl elsewhere).

export const SHORTCUTS = [
  { id: 'undo', keys: ['mod', 'Z'], description: 'Undo' },
  { id: 'redo', keys: ['mod', 'Shift', 'Z'], description: 'Redo' },
  { id: 'redo-alt', keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
  { id: 'help', keys: ['F1'], description: 'Open or close this help' },
]

// Expand a key combo for display, turning the 'mod' token into the platform's
// primary modifier. Returns an array of labels so each can render as its own
// <kbd>.
export function formatKeys(keys, isMac = false) {
  return keys.map(k => (k === 'mod' ? (isMac ? 'Cmd' : 'Ctrl') : k))
}
