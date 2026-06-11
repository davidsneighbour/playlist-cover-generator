// Browser-only programmatic PNG generation from a template and named inputs.
// Uses react-dom/server to render SVGCanvas to a string, then rasterizes with
// the Canvas 2D API. For Node.js rasterization, see src/generate.node.js.

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { buildStateFromTemplate } from './templateApi'
import { stripExportArtifacts } from './export'
import { SVGCanvas } from '../components/SVGCanvas'

/**
 * Render editor state to a clean SVG string ready for export.
 * `width`/`height` are set to the export dimensions; editor chrome is stripped.
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
 * Generate a PNG Blob from a template id (or template object) and named inputs.
 * Browser-only; returns a Promise<Blob>.
 *
 * inputs may include:
 *   backgroundImageData  — data URL for the background image
 *   [fieldName]          — string mapped to a text layer via template.fields
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
