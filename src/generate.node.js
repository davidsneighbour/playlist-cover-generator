/**
 * @module generate.node
 * @description Node.js programmatic PNG generation from a template and named
 * inputs. Rasterizes with `@resvg/resvg-js` (optional peer dependency).
 * For browser generation, see `src/lib/generate.js`.
 */

import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { buildStateFromTemplate } from './lib/templateApi.js'
import { SVGCanvas } from './components/SVGCanvas.jsx'

// Strip editor-only elements from the SVG string via regex (no DOM needed in Node).
// Removes any element whose opening tag contains data-layer="grid" or data-layer="selection".
function stripServerSvg(svgString) {
  // Remove self-closing tags with the marker attributes
  let out = svgString.replace(/<[^>]+data-layer="(?:grid|selection)"[^>]*\/>/g, '')
  // Remove element pairs (opening to closing) — handles <g ...> ... </g> and
  // simple <rect ... /> already caught above. For wrapping groups, use a simple
  // depth-aware pass instead of a greedy regex.
  out = out.replace(/<g\s[^>]*data-layer="(?:grid|selection)"[^>]*>[\s\S]*?<\/g>/g, '')
  return out
}

// Fix up the serialized SVG string: set width/height, clean React attributes,
// and remove editor chrome.
function prepareNodeSvg(rawHtml, exportWidth, exportHeight) {
  let svg = rawHtml
  // React's renderToString outputs HTML-style attributes; resvg handles them.
  // Strip the data-reactroot marker React may add.
  svg = svg.replace(/\s*data-reactroot=""/g, '')
  // Replace the width/height React rendered with the export dimensions.
  svg = svg.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, `$1 width="${exportWidth}"`)
  svg = svg.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, `$1 height="${exportHeight}"`)
  svg = stripServerSvg(svg)
  return svg
}

/**
 * Generate a PNG buffer from a template and named inputs. **Node.js only.**
 * Requires `@resvg/resvg-js` to be installed (`npm install @resvg/resvg-js`).
 *
 * @param {string|Object} templateOrId - Template id string or template object.
 * @param {Object} [inputs={}] - Named inputs; see {@link buildStateFromTemplate}.
 * @param {string} [inputs.backgroundImageData] - Data URL for the background image.
 * @returns {Promise<Uint8Array>} PNG bytes at the template's `exportWidth × exportHeight`.
 *
 * @example
 * import { generateFromTemplate } from 'posterboy-image-generator/node'
 * import { writeFileSync } from 'fs'
 *
 * const png = await generateFromTemplate('social-post', { title: 'Hello' })
 * writeFileSync('output.png', png)
 */
export async function generateFromTemplate(templateOrId, inputs = {}) {
  const state = buildStateFromTemplate(templateOrId, inputs)
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

  const svgString = prepareNodeSvg(raw, ew, eh)

  const { Resvg } = await import('@resvg/resvg-js')
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: ew },
  })
  return resvg.render().asPng()
}
