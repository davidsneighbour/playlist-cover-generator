import { memo } from 'react'

// Snap-grid overlay drawn over the canvas: minor lines every `spacing`, with a
// heavier major line every `majorEvery` cells. Marked data-layer="grid" so the
// exporters strip it (see stripExportArtifacts); it never appears in output.
// Memoized so it is not rebuilt on every drag tick (its props are stable while
// dragging a layer).
export const GridOverlay = memo(function GridOverlay({ grid, size }) {
  if (!grid.enabled) return null

  const lines = []
  const { spacing, majorEvery } = grid

  for (let x = spacing; x < size; x += spacing) {
    const isMajor = majorEvery > 0 && (x / spacing) % majorEvery === 0
    lines.push(
      <line
        key={`vx${x}`}
        x1={x} y1={0} x2={x} y2={size}
        stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
        strokeWidth={isMajor ? 0.8 : 0.4}
        strokeOpacity={isMajor ? 0.8 : 0.5}
      />
    )
  }
  for (let y = spacing; y < size; y += spacing) {
    const isMajor = majorEvery > 0 && (y / spacing) % majorEvery === 0
    lines.push(
      <line
        key={`hy${y}`}
        x1={0} y1={y} x2={size} y2={y}
        stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
        strokeWidth={isMajor ? 0.8 : 0.4}
        strokeOpacity={isMajor ? 0.8 : 0.5}
      />
    )
  }

  return <g data-layer="grid" style={{ pointerEvents: 'none' }}>{lines}</g>
})
