/**
 * @module rulers
 * @description Pure helper for the canvas rulers. It enumerates the tick marks along an edge
 * in canvas units (0..canvasSize); which ones are "major" (longer, labeled) is
 * decided here. Pixel positions are derived in the component from the live
 * display size, so this stays pure and unit-tested. Rulers are view chrome and
 * never part of an export.
 */
export function rulerTicks(canvasSize, { step = 50, majorEvery = 100 } = {}) {
  const ticks = []
  if (!(step > 0)) return ticks
  for (let v = 0; v <= canvasSize; v += step) {
    ticks.push({ value: v, major: majorEvery > 0 && v % majorEvery === 0 })
  }
  return ticks
}
