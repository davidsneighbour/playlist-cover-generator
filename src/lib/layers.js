// Pure helpers for text-layer z-ordering.
//
// The `texts` array order is the SVG paint order: index 0 is painted first
// (the bottom layer) and the last item is painted last (the top / front layer).
// Every function returns a NEW array when something changes, or the SAME array
// reference when the operation is a no-op, so callers can skip empty history
// entries with a simple identity check.

// Move the item at `fromIndex` to `toIndex`, shifting the rest. Used by
// drag-and-drop reordering.
export function reorder(layers, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= layers.length ||
    toIndex >= layers.length
  ) {
    return layers
  }
  const next = layers.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

// Move the layer with the given id to the top (end of the array / front).
export function bringToFront(layers, id) {
  const i = layers.findIndex(l => l.id === id)
  if (i < 0 || i === layers.length - 1) return layers
  const next = layers.slice()
  const [moved] = next.splice(i, 1)
  next.push(moved)
  return next
}

// Move the layer with the given id to the bottom (start of the array / back).
export function sendToBack(layers, id) {
  const i = layers.findIndex(l => l.id === id)
  if (i <= 0) return layers
  const next = layers.slice()
  const [moved] = next.splice(i, 1)
  next.unshift(moved)
  return next
}

// The layer list is shown front-to-back (top layer first), so a position in the
// displayed list maps to the reverse position in the paint-order array.
export function displayIndexToArrayIndex(length, displayIndex) {
  return length - 1 - displayIndex
}

// Insert a copy of the layer with `id` directly after it, built by
// makeCopy(original) (which must assign a fresh id). Placing the copy just after
// the original keeps it one step in front. Returns the same array if not found.
export function duplicateById(layers, id, makeCopy) {
  const i = layers.findIndex(l => l.id === id)
  if (i < 0) return layers
  const next = layers.slice()
  next.splice(i + 1, 0, makeCopy(layers[i]))
  return next
}
