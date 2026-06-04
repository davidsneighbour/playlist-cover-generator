import { useRef, useCallback } from 'react'
import { snapValue } from '../lib/grid'

// Shared pointer-drag hook for canvas layers. Returns a mousedown handler that
// tracks the pointer in SVG coordinate space (via getScreenCTM().inverse(), so
// it stays correct under responsive scaling) and translates movement into
// snapped, clamped canvas coordinates. getAnchor() reads the element's position
// at drag start; onMove(nx, ny) receives the new position; onStart() runs once
// on press (used to select).
export function useSvgDrag({ getAnchor, onMove, onStart, snapToGrid, gridSpacing, canvasSize, bounds }) {
  const dragging = useRef(false)
  const start = useRef({ mx: 0, my: 0, ax: 0, ay: 0 })

  return useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    onStart?.()
    dragging.current = true
    const svg = e.currentTarget.closest('svg')
    const toSvg = (clientX, clientY) => {
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      return p.matrixTransform(svg.getScreenCTM().inverse())
    }
    const sp = toSvg(e.clientX, e.clientY)
    const anchor = getAnchor()
    start.current = { mx: sp.x, my: sp.y, ax: anchor.x, ay: anchor.y }

    const onMouseMove = (ev) => {
      if (!dragging.current) return
      const m = toSvg(ev.clientX, ev.clientY)
      let nx = start.current.ax + (m.x - start.current.mx)
      let ny = start.current.ay + (m.y - start.current.my)
      nx = snapValue(nx, gridSpacing, snapToGrid)
      ny = snapValue(ny, gridSpacing, snapToGrid)
      const minX = bounds ? bounds.minX : 0
      const minY = bounds ? bounds.minY : 0
      const maxX = bounds ? bounds.maxX : canvasSize
      const maxY = bounds ? bounds.maxY : canvasSize
      nx = Math.max(minX, Math.min(maxX, nx))
      ny = Math.max(minY, Math.min(maxY, ny))
      onMove(nx, ny)
    }
    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [getAnchor, onMove, onStart, snapToGrid, gridSpacing, canvasSize, bounds])
}
