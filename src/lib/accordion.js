/**
 * @module accordion
 * @description Pure state logic for an accordion where at most one unpinned card is open at
 * a time, and pinned cards stay open regardless (exempt from auto-collapse).
 * State shape: `{ openId: string|null, pinned: string[] }`.
 */

export function isOpen(state, id) {
  return state.openId === id || state.pinned.includes(id)
}

// Toggle a card from its header. Opening a card makes it the single accordion
// card (collapsing the previous one); pinned cards stay open. Closing a card
// also unpins it, so the header always collapses what you see.
export function toggleOpen(state, id) {
  if (isOpen(state, id)) {
    return {
      openId: state.openId === id ? null : state.openId,
      pinned: state.pinned.filter(p => p !== id),
    }
  }
  return { openId: id, pinned: state.pinned }
}

// Toggle a card's pin. Pinning keeps it open even when another card opens (and
// frees the accordion slot if it held this card). Unpinning lets it collapse
// unless it is the current accordion card.
export function togglePin(state, id) {
  if (state.pinned.includes(id)) {
    return { openId: state.openId, pinned: state.pinned.filter(p => p !== id) }
  }
  return {
    openId: state.openId === id ? null : state.openId,
    pinned: [...state.pinned, id],
  }
}

// Ensure a card is open (used when adding a layer opens its properties card).
export function openCard(state, id) {
  if (id == null || isOpen(state, id)) return state
  return toggleOpen(state, id)
}
