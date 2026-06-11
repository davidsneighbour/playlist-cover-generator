/**
 * @module templateApi
 * @description Pure API for building editor state from a template and named inputs.
 * Browser- and Node.js-safe: no DOM, no React.
 */

import { getTemplate, instantiateTemplate } from './templates'
import { DEFAULT_BACKGROUND_TRANSFORM, DEFAULT_BACKGROUND_GRADIENT } from './background'
import { DEFAULT_FILTERS } from './filters'
import { DEFAULT_OVERLAY } from './overlay'
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './constants'
import { DEFAULT_EXPORT_WIDTH, DEFAULT_EXPORT_HEIGHT } from './canvas'

const BASE_STATE = {
  backgroundImage: null,
  backgroundImageData: null,
  backgroundNaturalWidth: null,
  backgroundNaturalHeight: null,
  backgroundTransform: DEFAULT_BACKGROUND_TRANSFORM,
  backgroundFilters: DEFAULT_FILTERS,
  backgroundGradient: DEFAULT_BACKGROUND_GRADIENT,
  texts: [],
  images: [],
  shapes: [],
  overlay: DEFAULT_OVERLAY,
  grid: { enabled: false, spacing: 20, majorEvery: 5 },
  snapToGrid: true,
  fonts: [],
  canvasWidth: DEFAULT_CANVAS_WIDTH,
  canvasHeight: DEFAULT_CANVAS_HEIGHT,
  exportWidth: DEFAULT_EXPORT_WIDTH,
  exportHeight: DEFAULT_EXPORT_HEIGHT,
}

/**
 * Build a complete editor state from a template id (or template object) and
 * named inputs. The returned state is independent of any React component and
 * safe to serialize or pass as `initialState`.
 *
 * @param {string|Object} templateOrId - Template id string or a template object
 *   from the {@link TEMPLATES} registry.
 * @param {Object} [inputs={}] - Named inputs to bind to the template's fields.
 * @param {string} [inputs.backgroundImageData] - Data URL for the background image.
 * @param {string} [inputs.*] - Any field name declared in `template.fields`
 *   maps to the corresponding text layer's `content`.
 * @returns {Object} A complete editor state object with `canvasWidth`,
 *   `canvasHeight`, `exportWidth`, `exportHeight`, `texts`, `overlay`, etc.
 *   Safe to pass as `initialState` to `ImageGenerator` or to feed into
 *   `generateFromTemplate`.
 * @throws {Error} If `templateOrId` is a string that does not match any
 *   registered template id.
 *
 * @example
 * // By template id
 * const state = buildStateFromTemplate('social-post', {
 *   backgroundImageData: 'data:image/jpeg;base64,...',
 *   label: 'MUSIC',
 *   title: 'Summer Playlist 2025',
 * })
 * // state.canvasWidth === 1080, state.canvasHeight === 566
 * // state.texts[0].content === 'MUSIC'
 *
 * @example
 * // By template object
 * import { getTemplate } from 'posterboy-image-generator'
 * const tpl = getTemplate('title-artist')
 * const state = buildStateFromTemplate(tpl, { title: 'My Album' })
 */
export function buildStateFromTemplate(templateOrId, inputs = {}) {
  const template = typeof templateOrId === 'string' ? getTemplate(templateOrId) : templateOrId
  if (!template) throw new Error(`Unknown template: ${templateOrId}`)

  let counter = 1
  const state = instantiateTemplate(template, { ...BASE_STATE }, () => counter++)

  if (inputs.backgroundImageData != null) {
    state.backgroundImageData = inputs.backgroundImageData
  }

  if (template.fields) {
    for (const field of template.fields) {
      if (field.type === 'text' && inputs[field.name] != null) {
        const layer = state.texts[field.textLayerIndex]
        if (layer) layer.content = inputs[field.name]
      }
    }
  }

  return state
}
