import { memo } from 'react'
import { offCanvasBounds } from '../lib/images'
import { ellipseGeometry, trianglePoints, cornerRadius, lineEndpoints } from '../lib/shapes'
import { describeLayer } from '../lib/a11y'
import { useSvgDrag } from '../hooks/useSvgDrag'

export const ShapeElement = memo(function ShapeElement({ shape, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: shape.x, y: shape.y }),
    onMove: (nx, ny) => onDrag(shape.id, nx, ny),
    onStart: () => onSelect(shape.id),
    snapToGrid, gridSpacing, canvasWidth, canvasHeight,
    // Lines share the drag model but skip the off-canvas margin bounds since
    // their bounding box may have zero width or height.
    bounds: shape.type === 'line' ? undefined : offCanvasBounds(shape.width, shape.height, canvasWidth, canvasHeight),
  })

  const interaction = {
    style: { cursor: locked ? 'default' : 'move', pointerEvents: locked ? 'none' : undefined },
    onMouseDown: locked ? undefined : handleMouseDown,
    'data-shape-id': shape.id,
    tabIndex: locked ? -1 : 0,
    role: 'button',
    'aria-label': describeLayer('shape', shape),
    'aria-pressed': selected,
    onKeyDown: (e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(shape.id) } },
  }

  if (shape.type === 'line') {
    const ep = lineEndpoints(shape)
    return (
      <line
        x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth || 2}
        strokeLinecap="round"
        fill="none"
        opacity={shape.opacity}
        {...interaction}
      />
    )
  }

  const common = {
    fill: shape.fill,
    stroke: shape.strokeWidth > 0 ? shape.stroke : 'none',
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    ...interaction,
  }

  if (shape.type === 'circle') {
    const g = ellipseGeometry(shape)
    return <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />
  }
  if (shape.type === 'triangle') {
    return <polygon points={trianglePoints(shape)} {...common} />
  }
  const r = cornerRadius(shape)
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={r || undefined} ry={r || undefined} {...common} />
})
