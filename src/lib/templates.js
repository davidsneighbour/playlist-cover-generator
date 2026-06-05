// Predefined cover layouts.
//
// A template is plain JSON-serializable data describing a starting layout: the
// text layers, the grid, and the snap setting. Coordinates are in the 600x600
// canvas space used by the editor. Text layers carry no `id`; a fresh one is
// assigned when the template is applied (see `instantiateTemplate`).

const SANS = 'sans-serif'
const SERIF = 'serif'

// Every text layer must define these keys so the editor's controls have a value
// to bind to. Kept in one place so tests and new templates stay in sync.
export const TEXT_KEYS = [
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
]

const DEFAULT_GRID = { enabled: false, spacing: 20, majorEvery: 5 }

// Build a text layer with sensible defaults so every layout stays in sync with
// TEXT_KEYS without repeating the full object. Pass only what differs.
function text(overrides) {
  return {
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
    ...overrides,
  }
}

export const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank',
    layout: {
      texts: [],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'title-artist',
    name: 'Title & artist',
    layout: {
      texts: [
        { content: 'Playlist Title', x: 300, y: 300, fontSize: 56, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'middle', stroke: '#000000', strokeWidth: 2, shadow: { color: '#000000', blur: 4, dx: 0, dy: 2 } },
        { content: 'Artist or Curator', x: 300, y: 356, fontSize: 26, fontFamily: SANS, color: '#ffffff', bold: false, italic: false, anchor: 'middle', stroke: '#000000', strokeWidth: 0, shadow: null },
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    layout: {
      texts: [
        { content: 'minimal', x: 300, y: 320, fontSize: 44, fontFamily: SERIF, color: '#111827', bold: false, italic: true, anchor: 'middle', stroke: '#000000', strokeWidth: 0, shadow: null },
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
  {
    id: 'grid-art',
    name: 'Grid art',
    layout: {
      texts: [
        { content: 'VOL. 01', x: 40, y: 80, fontSize: 28, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'start', stroke: '#000000', strokeWidth: 0, shadow: null },
        { content: 'Mixtape', x: 40, y: 560, fontSize: 72, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'start', stroke: '#000000', strokeWidth: 3, shadow: null },
      ],
      grid: { enabled: true, spacing: 40, majorEvery: 4 },
      snapToGrid: true,
    },
  },
  {
    id: 'top-bottom',
    name: 'Top & bottom',
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
    layout: {
      texts: [
        text({ content: 'chill', x: 40, y: 555, fontSize: 64, fontFamily: SERIF, italic: true, anchor: 'start', shadow: { color: '#000000', blur: 6, dx: 0, dy: 2 } }),
        text({ content: 'late night edition', x: 44, y: 585, fontSize: 22, anchor: 'start' }),
      ],
      grid: { ...DEFAULT_GRID },
      snapToGrid: true,
    },
  },
]

// Look up a template by id.
export function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id)
}

// Build editor state from a template. The current background image is kept (a
// template only defines text and layout), every text layer gets a fresh id from
// `makeId`, and grid/texts are deep-copied so the shared template data is never
// mutated by later edits.
export function instantiateTemplate(template, currentState, makeId) {
  const layout = template.layout
  return {
    ...currentState,
    texts: (layout.texts || []).map(t => ({ ...t, id: makeId() })),
    grid: { ...layout.grid },
    snapToGrid: layout.snapToGrid,
  }
}
