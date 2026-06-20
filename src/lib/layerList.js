/**
 * @module layerList
 * @description Build a unified, front-to-back list of everything on the canvas for the
 * Layers overview panel. Text, shape, and image entries carry their layer id
 * and selection state; the color overlay and background are singletons that are
 * always listed (muted when disabled/empty) so the panel can navigate to their
 * editing sections too. Each entry's `kind` tells the UI which card to open and
 * `icon` which glyph to show. Pure (no DOM/React), so it is unit-tested.
 */

export function buildLayerList(state, selection = {}) {
  const {
    selectedTextId = null,
    selectedImageId = null,
    selectedShapeId = null,
  } = selection
  const entries = []

  // Text layers, front-most first (matches the per-type lists' display order).
  const texts = state.texts || []
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]
    const autoLabel = t.content && t.content.trim() ? t.content : '(empty text)'
    entries.push({
      key: `text-${t.id}`,
      kind: 'text',
      id: t.id,
      icon: 'type',
      name: t.name || '',
      label: t.name || autoLabel,
      selected: t.id === selectedTextId,
      muted: !!t.hidden,
      hidden: !!t.hidden,
      locked: !!t.locked,
    })
  }

  // Shapes, front-most first.
  const shapes = state.shapes || []
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]
    const autoLabel = s.type === 'circle' ? 'Circle' : s.type === 'triangle' ? 'Triangle' : s.type === 'line' ? 'Line' : 'Rectangle'
    entries.push({
      key: `shape-${s.id}`,
      kind: 'shape',
      id: s.id,
      icon: s.type === 'circle' ? 'circle' : s.type === 'triangle' ? 'triangle' : s.type === 'line' ? 'minus' : 'square',
      name: s.name || '',
      label: s.name || autoLabel,
      selected: s.id === selectedShapeId,
      muted: !!s.hidden,
      hidden: !!s.hidden,
      locked: !!s.locked,
    })
  }

  // Image layers, front-most first.
  const images = state.images || []
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i]
    entries.push({
      key: `image-${img.id}`,
      kind: 'image',
      id: img.id,
      icon: 'image',
      name: img.name || '',
      label: img.name || 'Image',
      selected: img.id === selectedImageId,
      muted: !!img.hidden,
      hidden: !!img.hidden,
      locked: !!img.locked,
    })
  }

  // Color overlay (singleton): always listed so the panel can reach its card.
  const overlay = state.overlay || {}
  entries.push({
    key: 'overlay',
    kind: 'overlay',
    id: null,
    icon: 'blend',
    label: 'Color overlay',
    selected: false,
    muted: !overlay.enabled,
  })

  // Background (singleton): image name, gradient, or empty.
  const gradient = state.backgroundGradient || {}
  const hasImage = !!state.backgroundImage
  const hasGradient = !!gradient.enabled
  entries.push({
    key: 'background',
    kind: 'background',
    id: null,
    icon: 'image',
    label: hasImage ? state.backgroundImage : hasGradient ? 'Gradient background' : 'No background',
    selected: false,
    muted: !hasImage && !hasGradient,
  })

  return entries
}
