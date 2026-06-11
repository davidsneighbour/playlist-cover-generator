/**
 * @module color
 * @description Pure color helpers for choosing a readable default text color against the
 * current background. Sampling the background (drawing to a canvas) happens in
 * the component; the math here is pure and tested.
 */

const DARK = '#111827'
const LIGHT = '#ffffff'

// Perceived brightness of an sRGB color in the 0..1 range (Rec. 601 luma).
export function relativeLuminance({ r, g, b }) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// Average an RGBA pixel buffer (e.g. from getImageData) into a single { r, g, b }.
// Fully transparent pixels are ignored so they do not drag the average toward 0.
export function averageRgb(data) {
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha === 0) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  if (count === 0) return { r: 255, g: 255, b: 255 }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
}

// Pick a dark or light text color for good contrast against a background color.
export function pickContrastColor(rgb) {
  return relativeLuminance(rgb) > 0.55 ? DARK : LIGHT
}
