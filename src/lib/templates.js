/**
 * @module templates
 * @description Predefined image layouts. Every template defines text layers,
 * grid settings, canvas dimensions, and optional field bindings for the
 * programmatic API. Text layers carry no `id`; a fresh one is assigned on apply.
 */

const SANS = 'sans-serif'
const SERIF = 'serif'

/**
 * All required keys for a text layer object.
 * Every entry in `template.layout.texts` must define every key in this list
 * so the editor's controls always have a value to bind to.
 * @type {string[]}
 */
export const TEXT_KEYS = [
  'name',
  'content',
  'x',
  'y',
  'fontSize',
  'fontFamily',
  'color',
  'bold',
  'italic',
  'anchor',
  'stroke',
  'strokeWidth',
  'shadow',
  'lineHeight',
  'opacity',
  'rotation',
]

const DEFAULT_GRID = { enabled: false, spacing: 20, majorEvery: 5 }

// Build a text layer with sensible defaults so every layout stays in sync with
// TEXT_KEYS without repeating the full object. Pass only what differs.
function text(overrides) {
  return {
    name: '',
    content: 'Text',
    x: 300,
    y: 300,
    fontSize: 40,
    fontFamily: SANS,
    color: '#ffffff',
    bold: false,
    italic: false,
    anchor: 'middle',
    stroke: '#000000',
    strokeWidth: 0,
    shadow: null,
    lineHeight: 1.2,
    opacity: 1,
    rotation: 0,
    ...overrides,
  }
}

/**
 * All available templates. Each entry defines canvas dimensions, text layers,
 * grid settings, and optional named-input field bindings.
 * @type {Array<Object>}
 */
export const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank',
    category: 'music',
    description: 'An empty canvas for complete creative freedom.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'title-artist',
    name: 'Title & artist',
    category: 'music',
    description: 'Large centered title with artist name below.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [
      { name: 'title', type: 'text', textLayerIndex: 0 },
      { name: 'artist', type: 'text', textLayerIndex: 1 },
    ],
    layout: {
      texts: [
        text({ content: 'Playlist Title', x: 300, y: 300, fontSize: 56, color: '#ffffff', bold: true, strokeWidth: 2, shadow: { color: '#000000', blur: 4, dx: 0, dy: 2 } }),
        text({ content: 'Artist or Curator', x: 300, y: 356, fontSize: 26, color: '#ffffff' }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'music',
    description: 'Single italic serif word centered on a clean background.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'minimal', x: 300, y: 320, fontSize: 44, fontFamily: SERIF, color: '#111827', italic: true }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'grid-art',
    name: 'Grid art',
    category: 'music',
    description: 'Volume label at top-left, large mixtape title at bottom-left over a visible grid.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'VOL. 01', x: 40, y: 80, fontSize: 28, color: '#ffffff', bold: true, anchor: 'start' }),
        text({ content: 'Mixtape', x: 40, y: 560, fontSize: 72, color: '#ffffff', bold: true, anchor: 'start', strokeWidth: 3 }),
      ],
      grid: { enabled: true, spacing: 40, majorEvery: 4 },
      snapToGrid: true,
    },
  },
  {
    id: 'top-bottom',
    name: 'Top & bottom',
    category: 'music',
    description: 'Small label at top, large playlist name anchored to the bottom.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'NOW PLAYING', x: 300, y: 70, fontSize: 24, bold: true, shadow: { color: '#000000', blur: 4, dx: 0, dy: 1 } }),
        text({ content: 'Playlist Name', x: 300, y: 545, fontSize: 48, bold: true, shadow: { color: '#000000', blur: 6, dx: 0, dy: 2 } }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'quote',
    name: 'Quote',
    category: 'music',
    description: 'Italic serif quote with attribution below.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: '“Good music”', x: 300, y: 280, fontSize: 46, fontFamily: SERIF, italic: true, shadow: { color: '#000000', blur: 6, dx: 0, dy: 2 } }),
        text({ content: '— a curator', x: 300, y: 340, fontSize: 24, fontFamily: SERIF }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'bold-stack',
    name: 'Bold stack',
    category: 'music',
    description: 'Two stacked bold display words with a subtitle beneath.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'DEEP', x: 50, y: 250, fontSize: 96, fontFamily: SANS, bold: true, anchor: 'start' }),
        text({ content: 'FOCUS', x: 50, y: 350, fontSize: 96, fontFamily: SANS, bold: true, anchor: 'start', color: '#facc15' }),
        text({ content: 'beats to work to', x: 52, y: 410, fontSize: 26, anchor: 'start' }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'podcast',
    name: 'Podcast',
    category: 'music',
    description: 'Episode label, show title, and host credit centered on the canvas.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [
      { name: 'episode', type: 'text', textLayerIndex: 0 },
      { name: 'title', type: 'text', textLayerIndex: 1 },
      { name: 'host', type: 'text', textLayerIndex: 2 },
    ],
    layout: {
      texts: [
        text({ content: 'EPISODE 01', x: 300, y: 90, fontSize: 22, bold: true, color: '#facc15' }),
        text({ content: 'Show Title', x: 300, y: 310, fontSize: 60, bold: true, shadow: { color: '#000000', blur: 6, dx: 0, dy: 2 } }),
        text({ content: 'with Your Host', x: 300, y: 365, fontSize: 26 }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'festival',
    name: 'Festival',
    category: 'music',
    description: 'Bold italic two-line display title with a subtitle.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'SUMMER', x: 300, y: 230, fontSize: 84, bold: true, italic: true, stroke: '#000000', strokeWidth: 2 }),
        text({ content: 'SESSIONS', x: 300, y: 310, fontSize: 84, bold: true, italic: true, stroke: '#000000', strokeWidth: 2 }),
        text({ content: 'the essential mix', x: 300, y: 380, fontSize: 28 }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'corner-label',
    name: 'Corner label',
    category: 'music',
    description: 'Italic serif title and subtitle anchored to the bottom-left corner.',
    canvasWidth: 600,
    canvasHeight: 600,
    exportWidth: 600,
    exportHeight: 600,
    fields: [],
    layout: {
      texts: [
        text({ content: 'chill', x: 40, y: 555, fontSize: 64, fontFamily: SERIF, italic: true, anchor: 'start', shadow: { color: '#000000', blur: 6, dx: 0, dy: 2 } }),
        text({ content: 'late night edition', x: 44, y: 585, fontSize: 22, anchor: 'start' }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'social-post',
    name: 'Social media post',
    category: 'social',
    description: 'Wide 1080\xd7566 post: background image with a bottom-left label and title over a dark gradient.',
    canvasWidth: 1080,
    canvasHeight: 566,
    exportWidth: 1080,
    exportHeight: 566,
    fields: [
      { name: 'backgroundImage', type: 'image' },
      { name: 'label', type: 'text', textLayerIndex: 0 },
      { name: 'title', type: 'text', textLayerIndex: 1 },
    ],
    layout: {
      texts: [
        text({ content: 'LABEL TEXT', x: 48, y: 490, fontSize: 20, color: '#ffffff', anchor: 'start' }),
        text({ content: 'Post Title', x: 48, y: 534, fontSize: 36, color: '#ffffff', bold: true, anchor: 'start', shadow: { color: '#000000', blur: 8, dx: 0, dy: 2 } }),
      ],
      overlay: {
        enabled: true,
        type: 'linear',
        color: '#000000',
        opacity: 0,
        color2: '#000000',
        opacity2: 0.65,
        angle: 0,
        blendMode: 'normal',
      },
      grid: { enabled: false, spacing: 40, majorEvery: 5 },
      snapToGrid: false,
    },
  },
  {
    id: 'social-square',
    name: 'Social media square',
    category: 'social',
    description: 'Square 1080\xd71080 post: background image with a bottom-left label and title over a dark gradient.',
    canvasWidth: 1080,
    canvasHeight: 1080,
    exportWidth: 1080,
    exportHeight: 1080,
    fields: [
      { name: 'backgroundImage', type: 'image' },
      { name: 'label', type: 'text', textLayerIndex: 0 },
      { name: 'title', type: 'text', textLayerIndex: 1 },
    ],
    layout: {
      texts: [
        text({ content: 'LABEL TEXT', x: 48, y: 940, fontSize: 24, color: '#ffffff', anchor: 'start' }),
        text({ content: 'Post Title', x: 48, y: 994, fontSize: 44, color: '#ffffff', bold: true, anchor: 'start', shadow: { color: '#000000', blur: 8, dx: 0, dy: 2 } }),
      ],
      overlay: {
        enabled: true,
        type: 'linear',
        color: '#000000',
        opacity: 0,
        color2: '#000000',
        opacity2: 0.65,
        angle: 0,
        blendMode: 'normal',
      },
      grid: { enabled: false, spacing: 40, majorEvery: 5 },
      snapToGrid: false,
    },
  },
]

/**
 * Look up a template by id.
 * @param {string} id - Template id (e.g. `'social-post'`).
 * @returns {Object|undefined} The matching template, or `undefined` if not found.
 */
export function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id)
}

/**
 * Build editor state from a template. The background image is kept (templates
 * only define text and layout). Text layers get fresh ids from `makeId`. Canvas
 * and export dimensions are applied when the template defines them. The overlay
 * is applied when the template layout defines it.
 * @param {Object} template - A template object from {@link TEMPLATES}.
 * @param {Object} currentState - Current editor state to merge into.
 * @param {function(): *} makeId - Factory that returns a fresh unique id.
 * @returns {Object} New state object with the template layout applied.
 */
export function instantiateTemplate(template, currentState, makeId) {
  const layout = template.layout
  const patch = {
    ...currentState,
    texts: (layout.texts || []).map(t => ({ ...t, id: makeId() })),
    grid: { ...layout.grid },
    snapToGrid: layout.snapToGrid,
  }
  if (template.canvasWidth != null) patch.canvasWidth = template.canvasWidth
  if (template.canvasHeight != null) patch.canvasHeight = template.canvasHeight
  if (template.exportWidth != null) patch.exportWidth = template.exportWidth
  if (template.exportHeight != null) patch.exportHeight = template.exportHeight
  if (layout.overlay != null) patch.overlay = { ...layout.overlay }
  return patch
}
