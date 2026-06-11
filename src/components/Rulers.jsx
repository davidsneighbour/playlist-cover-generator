import { rulerTicks } from '../lib/rulers'
import { RULER } from '../lib/constants'

// Rulers along the top and left of the canvas, showing canvas-unit coordinates.
// They are plain chrome rendered outside the exported SVG, so they never appear
// in PNG or SVG output. Tick values come from the pure `rulerTicks`; pixel
// positions scale with the live display size.
function RulerMarks({ displaySize, canvasSize, axis }) {
  const ticks = rulerTicks(canvasSize)
  return ticks.map(({ value, major }) => {
    const px = (value / canvasSize) * displaySize
    const len = major ? 8 : 5
    const showLabel = major && value !== 0 && value !== canvasSize
    if (axis === 'top') {
      return (
        <g key={value}>
          <line x1={px} y1={RULER - len} x2={px} y2={RULER} stroke="#cbd5e1" strokeWidth={0.75} />
          {showLabel && <text x={px} y={9} fontSize={8} fill="#9ca3af" textAnchor="middle">{value}</text>}
        </g>
      )
    }
    return (
      <g key={value}>
        <line x1={RULER - len} y1={px} x2={RULER} y2={px} stroke="#cbd5e1" strokeWidth={0.75} />
        {showLabel && <text x={11} y={px} fontSize={8} fill="#9ca3af" textAnchor="middle" transform={`rotate(-90 11 ${px})`}>{value}</text>}
      </g>
    )
  })
}

export function TopRuler({ displayWidth, canvasWidth }) {
  return (
    <svg width={displayWidth} height={RULER} className="block bg-gray-50" aria-hidden="true">
      <line x1={0} y1={RULER - 0.5} x2={displayWidth} y2={RULER - 0.5} stroke="#e5e7eb" strokeWidth={1} />
      <RulerMarks displaySize={displayWidth} canvasSize={canvasWidth} axis="top" />
    </svg>
  )
}

export function LeftRuler({ displayHeight, canvasHeight }) {
  return (
    <svg width={RULER} height={displayHeight} className="block bg-gray-50" aria-hidden="true">
      <line x1={RULER - 0.5} y1={0} x2={RULER - 0.5} y2={displayHeight} stroke="#e5e7eb" strokeWidth={1} />
      <RulerMarks displaySize={displayHeight} canvasSize={canvasHeight} axis="left" />
    </svg>
  )
}
