import { memo } from 'react'
import { textStrokeAttrs, textShadowFilter, textLines, lineHeightEm } from '../lib/text'
import { describeLayer } from '../lib/a11y'
import { useSvgDrag } from '../hooks/useSvgDrag'

export const TextElement = memo(function TextElement({ text, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: text.x, y: text.y }),
    onMove: (nx, ny) => onDrag(text.id, nx, ny),
    onStart: () => onSelect(text.id),
    snapToGrid, gridSpacing, canvasWidth, canvasHeight,
  })

  const shadow = textShadowFilter(text)

  return (
    <text
      x={text.x}
      y={text.y}
      fontFamily={text.fontFamily}
      fontSize={text.fontSize}
      fill={text.color}
      opacity={text.opacity ?? 1}
      {...textStrokeAttrs(text)}
      filter={shadow ? `url(#${shadow.id})` : undefined}
      fontWeight={text.bold ? 'bold' : 'normal'}
      fontStyle={text.italic ? 'italic' : 'normal'}
      textAnchor={text.anchor || 'start'}
      dominantBaseline="auto"
      transform={text.rotation ? `rotate(${text.rotation} ${text.x} ${text.y})` : undefined}
      style={{ cursor: locked ? 'default' : 'move', userSelect: 'none', pointerEvents: locked ? 'none' : undefined }}
      onMouseDown={locked ? undefined : handleMouseDown}
      data-text-id={text.id}
      tabIndex={locked ? -1 : 0}
      role="button"
      aria-label={describeLayer('text', text)}
      aria-pressed={selected}
      onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(text.id) } }}
    >
      {textLines(text).map((line, i) => (
        <tspan key={i} x={text.x} dy={i === 0 ? 0 : `${lineHeightEm(text)}em`}>
          {line || '​'}
        </tspan>
      ))}
      {selected && (
        <title>Selected: drag to move</title>
      )}
    </text>
  )
})
