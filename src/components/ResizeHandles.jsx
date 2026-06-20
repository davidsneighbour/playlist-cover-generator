import { resizeFromCorner } from '../lib/images'
import { lineEndpoints } from '../lib/shapes'

// Corner handles for resizing the selected image or shape. The opposite corner
// stays fixed; holding Shift locks the aspect ratio. Tagged via the wrapping
// group so exports strip them.
export function ResizeHandles({ box, ratio, onResize }) {
  const SIZE = 12
  const corners = [
    { key: 'tl', x: box.x, y: box.y, fx: box.x + box.width, fy: box.y + box.height, cursor: 'nwse-resize' },
    { key: 'tr', x: box.x + box.width, y: box.y, fx: box.x, fy: box.y + box.height, cursor: 'nesw-resize' },
    { key: 'bl', x: box.x, y: box.y + box.height, fx: box.x + box.width, fy: box.y, cursor: 'nesw-resize' },
    { key: 'br', x: box.x + box.width, y: box.y + box.height, fx: box.x, fy: box.y, cursor: 'nwse-resize' },
  ]
  const startResize = (e, corner) => {
    e.preventDefault()
    e.stopPropagation()
    const svg = e.currentTarget.closest('svg')
    const toSvg = (clientX, clientY) => {
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      return p.matrixTransform(svg.getScreenCTM().inverse())
    }
    const onMove = (ev) => {
      const m = toSvg(ev.clientX, ev.clientY)
      onResize(resizeFromCorner(corner.fx, corner.fy, m.x, m.y, { ratio, lockAspect: ev.shiftKey }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  return corners.map(c => (
    <rect
      key={c.key}
      x={c.x - SIZE / 2}
      y={c.y - SIZE / 2}
      width={SIZE}
      height={SIZE}
      fill="#ffffff"
      stroke="#3b82f6"
      strokeWidth={1.5}
      style={{ cursor: c.cursor }}
      onMouseDown={e => startResize(e, c)}
    />
  ))
}

// Endpoint handles for resizing a selected line. Dragging the start handle keeps
// the end fixed; dragging the end handle keeps the start fixed.
export function LineResizeHandles({ shape, onResize }) {
  const ep = lineEndpoints(shape)
  const R = 6

  const startDrag = (e, isStart) => {
    e.preventDefault()
    e.stopPropagation()
    const svg = e.currentTarget.closest('svg')
    const toSvg = (cx, cy) => {
      const p = svg.createSVGPoint()
      p.x = cx; p.y = cy
      return p.matrixTransform(svg.getScreenCTM().inverse())
    }
    const onMove = (ev) => {
      const m = toSvg(ev.clientX, ev.clientY)
      if (isStart) {
        const endX = shape.x + shape.width
        const endY = shape.y + shape.height
        onResize({ x: m.x, y: m.y, width: endX - m.x, height: endY - m.y })
      } else {
        onResize({ width: m.x - shape.x, height: m.y - shape.y })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
      <circle cx={ep.x1} cy={ep.y1} r={R} fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5} style={{ cursor: 'move' }} onMouseDown={e => startDrag(e, true)} />
      <circle cx={ep.x2} cy={ep.y2} r={R} fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5} style={{ cursor: 'move' }} onMouseDown={e => startDrag(e, false)} />
    </>
  )
}
