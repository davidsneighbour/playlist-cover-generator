// Pure helpers for the background image filters. The filter itself is an SVG
// <filter> (so it survives PNG and SVG export, unlike a CSS `filter`); this
// module holds the defaults, an "is anything changed?" check, and the math that
// folds brightness and contrast into a single linear transfer function.

// All multipliers are 1 = unchanged; blur is in canvas units (0 = none).
export const DEFAULT_FILTERS = { brightness: 1, contrast: 1, saturate: 1, blur: 0 }

// True when any filter differs from its neutral default, so the component can
// skip the <filter> entirely when nothing is applied.
export function isFilterActive(f) {
  if (!f) return false
  return (
    Number(f.brightness) !== 1 ||
    Number(f.contrast) !== 1 ||
    Number(f.saturate) !== 1 ||
    Number(f.blur) !== 0
  )
}

// Brightness (multiply) followed by contrast (pivot around 0.5) collapse into a
// single linear feComponentTransfer: out = slope*in + intercept, where
//   contrast(brightness(x)) = (b*x - 0.5)*c + 0.5 = (b*c)*x + 0.5*(1 - c).
export function brightnessContrastTransfer(brightness, contrast) {
  const b = Number.isNaN(Number(brightness)) ? 1 : Number(brightness)
  const c = Number.isNaN(Number(contrast)) ? 1 : Number(contrast)
  return { slope: b * c, intercept: 0.5 * (1 - c) }
}
