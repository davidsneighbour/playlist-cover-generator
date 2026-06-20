/**
 * @module export
 * @description Export helpers for turning the live editor SVG into portable output.
 * Kept DOM-light so the invariants can be unit-tested.
 */

import { exportScale } from './canvas.js'
import { fontVariantKey, variantFontFace, pickVariantFile, buildFontFaceRule } from './fonts.js'

// Editor-only elements that must never appear in exported PNG/SVG: the snap grid
// and the selection outline/handles. Both carry a `data-layer` marker.
export const EXPORT_STRIP_SELECTOR = '[data-layer="grid"], [data-layer="selection"]'

// Remove the editor-only layers from a cloned SVG before serialization or
// rasterization. Mutates and returns the clone so callers can chain.
export function stripExportArtifacts(clone) {
  clone.querySelectorAll(EXPORT_STRIP_SELECTOR).forEach((el) => el.remove())
  return clone
}

// Clone the live SVG element, strip editor-only artifacts, and set the export
// dimensions. Returns the prepared clone; the original is not mutated.
export function prepareCloneForExport(svgEl, width, height) {
  const clone = svgEl.cloneNode(true)
  stripExportArtifacts(clone)
  clone.setAttribute('width', width)
  clone.setAttribute('height', height)
  return clone
}

// Remove interactive-only inline styles from text elements. Needed for SVG
// export so the output file does not carry editor cursor behaviour.
export function clearInteractionStyles(clone) {
  clone.querySelectorAll('[data-text-id]').forEach((el) => {
    el.style.cursor = ''
    el.style.userSelect = ''
  })
  return clone
}

// Serialize a prepared SVG clone to a string using XMLSerializer.
export function serializeSvgClone(clone) {
  return new XMLSerializer().serializeToString(clone)
}

function bufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// Inline the custom (Google) fonts actually used by text layers as base64
// @font-face rules inside the clone, so PNG and SVG exports render correctly
// without a network connection. Only the weight/style variants actually in use
// are fetched. Fetch failures are swallowed so export still succeeds with a
// system fallback.
//
// `loadCatalog` is injectable (returns a promise of the font-item array) so
// callers can supply a module-level cache or a mock in tests.
export async function embedFontsInClone(clone, texts, fonts, loadCatalog) {
  const used = new Set((texts || []).map((t) => t.fontFamily))
  const families = (fonts || []).filter((f) => used.has(f))
  if (families.length === 0) return

  const catalog = await loadCatalog()
  const byFamily = new Map(catalog.map((item) => [item.family, item]))
  const rules = []

  for (const family of families) {
    const item = byFamily.get(family)
    if (!item || !item.files) continue
    const variants = new Set(
      (texts || []).filter((t) => t.fontFamily === family).map((t) => fontVariantKey(t.bold, t.italic))
    )
    for (const variant of variants) {
      const fileUrl = pickVariantFile(item.files, variant)
      if (!fileUrl) continue
      try {
        const res = await fetch(fileUrl.replace(/^http:/, 'https:'))
        if (!res.ok) continue
        const dataUri = `data:font/ttf;base64,${bufferToBase64(await res.arrayBuffer())}`
        const { weight, style } = variantFontFace(variant)
        rules.push(buildFontFaceRule(family, { url: dataUri, weight, style, format: 'truetype' }))
      } catch {
        // Could not fetch this face; export proceeds with a system fallback.
      }
    }
  }

  if (rules.length === 0) return
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.setAttribute('data-embedded-fonts', '')
  styleEl.textContent = rules.join('\n')
  clone.insertBefore(styleEl, clone.firstChild)
}

// Rasterize a prepared SVG clone (artifacts stripped, fonts embedded,
// width/height set) to a PNG Blob at the given export dimensions.
// Shared by single PNG export and batch export.
export function svgCloneToPngBlob(clone, exportWidth, exportHeight, canvasWidth, canvasHeight) {
  const svgStr = serializeSvgClone(clone)
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = exportWidth
      canvas.height = exportHeight
      const ctx = canvas.getContext('2d')
      ctx.scale(exportScale(exportWidth, canvasWidth), exportScale(exportHeight, canvasHeight))
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}
