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
]

const DEFAULT_GRID = { enabled: false, spacing: 20, majorEvery: 5 }

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
        { content: 'Playlist Title', x: 300, y: 300, fontSize: 56, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'middle' },
        { content: 'Artist or Curator', x: 300, y: 356, fontSize: 26, fontFamily: SANS, color: '#ffffff', bold: false, italic: false, anchor: 'middle' },
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
        { content: 'minimal', x: 300, y: 320, fontSize: 44, fontFamily: SERIF, color: '#111827', bold: false, italic: true, anchor: 'middle' },
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
        { content: 'VOL. 01', x: 40, y: 80, fontSize: 28, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'start' },
        { content: 'Mixtape', x: 40, y: 560, fontSize: 72, fontFamily: SANS, color: '#ffffff', bold: true, italic: false, anchor: 'start' },
      ],
      grid: { enabled: true, spacing: 40, majorEvery: 4 },
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
