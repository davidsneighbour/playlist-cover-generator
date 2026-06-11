/**
 * @module generate
 * @description Browser-only programmatic PNG generation from a template and
 * named inputs. Uses `react-dom/server` to render `SVGCanvas` to a string,
 * then rasterizes with the Canvas 2D API.
 * For Node.js rasterization, see `src/generate.node.js`.
 */

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { buildStateFromTemplate } from './templateApi'
import { stripExportArtifacts } from './export'
import { SVGCanvas } from '../components/SVGCanvas'

/**
 * Render editor state to a clean SVG string ready for export.
 * Sets `width`/`height` attributes to the export dimensions and strips
 * editor-only chrome (grid, selection handles).
 *
 * @param {Object} state - Editor state object (e.g. from {@link buildStateFromTemplate}).
 * @returns {string} Serialized SVG markup ready to display or rasterize.
 */
export function renderStateToSvgString(state) {
  const ew = state.exportWidth ?? state.canvasWidth ?? 600
  const eh = state.exportHeight ?? state.canvasHeight ?? 600
  const raw = renderToString(
    createElement(SVGCanvas, {
      state,
      selectedTextId: null,
      selectedImageId: null,
      selectedShapeId: null,
      displayWidth: ew,
      displayHeight: eh,
    })
  )
  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'image/svg+xml')
  const svg = doc.documentElement
  svg.setAttribute('width', String(ew))
  svg.setAttribute('height', String(eh))
  stripExportArtifacts(svg)
  return new XMLSerializer().serializeToString(svg)
}

/**
 * Generate a PNG Blob from a template and named inputs. **Browser-only.**
 *
 * @param {string|Object} templateOrId - Template id string or template object.
 * @param {Object} [inputs={}] - Named inputs; see {@link buildStateFromTemplate}.
 * @param {string} [inputs.backgroundImageData] - Data URL for the background image.
 * @returns {Promise<Blob>} A PNG Blob at the template's `exportWidth × exportHeight`.
 *
 * @example
 * const blob = await generateFromTemplate('social-post', {
 *   backgroundImageData: 'data:image/jpeg;base64,...',
 *   title: 'My post',
 * })
 * const url = URL.createObjectURL(blob)
 * img.src = url
 */
export async function generateFromTemplate(templateOrId, inputs = {}) {
  const state = buildStateFromTemplate(templateOrId, inputs)
  const ew = state.exportWidth ?? state.canvasWidth ?? 600
  const eh = state.exportHeight ?? state.canvasHeight ?? 600
  const svgString = renderStateToSvgString(state)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = ew
    canvas.height = eh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
