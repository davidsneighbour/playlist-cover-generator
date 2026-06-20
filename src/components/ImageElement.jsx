import { memo } from 'react'
import { offCanvasBounds } from '../lib/images'
import { describeLayer } from '../lib/a11y'
import { useSvgDrag } from '../hooks/useSvgDrag'

export const ImageElement = memo(function ImageElement({ image, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: image.x, y: image.y }),
    onMove: (nx, ny) => onDrag(image.id, nx, ny),
    onStart: () => onSelect(image.id),
    snapToGrid, gridSpacing, canvasWidth, canvasHeight,
    bounds: offCanvasBounds(image.width, image.height, canvasWidth, canvasHeight),
  })

  if (!image.data) return null

  const cx = image.x + image.width / 2
  const cy = image.y + image.height / 2

  return (
    <image
      href={image.data}
      x={image.x}
      y={image.y}
      width={image.width}
      height={image.height}
      opacity={image.opacity}
      preserveAspectRatio="none"
      transform={image.rotation ? `rotate(${image.rotation} ${cx} ${cy})` : undefined}
      style={{ cursor: locked ? 'default' : 'move', pointerEvents: locked ? 'none' : undefined, mixBlendMode: image.blendMode !== 'normal' ? image.blendMode : undefined }}
      onMouseDown={locked ? undefined : handleMouseDown}
      data-image-id={image.id}
      tabIndex={locked ? -1 : 0}
      role="button"
      aria-label={describeLayer('image', image)}
      aria-pressed={selected}
      onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(image.id) } }}
    />
  )
})
