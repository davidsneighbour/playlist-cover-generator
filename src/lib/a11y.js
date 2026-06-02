// Pure helpers for accessibility announcements. The component owns the ARIA
// live region and calls these to build the message it speaks, so the wording is
// in one tested place.

// Human noun for a layer kind, used in announcements and labels.
export function layerNoun(kind) {
  if (kind === 'text') return 'Text layer'
  if (kind === 'image') return 'Image layer'
  if (kind === 'shape') return 'Shape'
  return 'Layer'
}

// Message announced when a layer is added, deleted, or duplicated.
export function actionAnnouncement(action, kind) {
  const noun = layerNoun(kind)
  if (action === 'add') return `${noun} added`
  if (action === 'delete') return `${noun} deleted`
  if (action === 'duplicate') return `${noun} duplicated`
  return noun
}
