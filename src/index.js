/**
 * @module posterboy-image-generator
 * @description Public API for the posterboy-image-generator package.
 * Exports the React editor component, the pure state builder, and
 * the browser-side PNG generator.
 */

export { default as ImageGenerator } from './components/CoverGenerator'
export { default as CoverGenerator } from './components/CoverGenerator'
export { buildStateFromTemplate } from './lib/templateApi'
export { generateFromTemplate, renderStateToSvgString } from './lib/generate'
export { TEMPLATES, getTemplate } from './lib/templates'
