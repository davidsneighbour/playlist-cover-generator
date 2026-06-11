import { useState, useRef, useLayoutEffect, memo } from 'react'
import { textStrokeAttrs, textShadowFilter, textLines, lineHeightEm } from '../lib/text'
import { offCanvasBounds, resizeFromCorner, clampOpacity } from '../lib/images'
import { ellipseGeometry, trianglePoints, cornerRadius } from '../lib/shapes'
import { gradientVector } from '../lib/overlay'
import { backgroundCrop } from '../lib/background'
import { DEFAULT_FILTERS, isFilterActive, brightnessContrastTransfer } from '../lib/filters'
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '../lib/constants'
import { describeLayer } from '../lib/a11y'
import { useSvgDrag } from '../hooks/useSvgDrag'
import { GridOverlay } from './GridOverlay'

const TextElement = memo(function TextElement({ text, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
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
      {...textStrokeAttrs(text)}
      filter={shadow ? `url(#${shadow.id})` : undefined}
      fontWeight={text.bold ? 'bold' : 'normal'}
      fontStyle={text.italic ? 'italic' : 'normal'}
      textAnchor={text.anchor || 'start'}
      dominantBaseline="auto"
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

const ImageElement = memo(function ImageElement({ image, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: image.x, y: image.y }),
    onMove: (nx, ny) => onDrag(image.id, nx, ny),
    onStart: () => onSelect(image.id),
    snapToGrid, gridSpacing, canvasWidth, canvasHeight,
    bounds: offCanvasBounds(image.width, image.height, canvasWidth, canvasHeight),
  })

  if (!image.data) return null

  return (
    <image
      href={image.data}
      x={image.x}
      y={image.y}
      width={image.width}
      height={image.height}
      opacity={image.opacity}
      preserveAspectRatio="none"
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

// Corner handles for resizing the selected image. The opposite corner stays
// fixed; holding Shift locks the aspect ratio. Tagged via the wrapping group so
// exports strip them.
function ResizeHandles({ box, ratio, onResize }) {
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

const ShapeElement = memo(function ShapeElement({ shape, selected, locked, onSelect, onDrag, snapToGrid, gridSpacing, canvasWidth, canvasHeight }) {
  const handleMouseDown = useSvgDrag({
    getAnchor: () => ({ x: shape.x, y: shape.y }),
    onMove: (nx, ny) => onDrag(shape.id, nx, ny),
    onStart: () => onSelect(shape.id),
    snapToGrid, gridSpacing, canvasWidth, canvasHeight,
    bounds: offCanvasBounds(shape.width, shape.height, canvasWidth, canvasHeight),
  })

  const common = {
    fill: shape.fill,
    stroke: shape.strokeWidth > 0 ? shape.stroke : 'none',
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    style: { cursor: locked ? 'default' : 'move', pointerEvents: locked ? 'none' : undefined },
    onMouseDown: locked ? undefined : handleMouseDown,
    'data-shape-id': shape.id,
    tabIndex: locked ? -1 : 0,
    role: 'button',
    'aria-label': describeLayer('shape', shape),
    'aria-pressed': selected,
    onKeyDown: (e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(shape.id) } },
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

// Two-stop gradient that fills the canvas beneath the background image, so it
// shows through when no image is loaded (an opaque image covers it). Reuses the
// same gradient-axis math as the overlay. pointer-events stay off.
const GradientBackground = memo(function GradientBackground({ gradient, canvasWidth, canvasHeight }) {
  if (!gradient || !gradient.enabled) return null
  const id = 'background-gradient'
  const stops = (
    <>
      <stop offset="0%" stopColor={gradient.color} />
      <stop offset="100%" stopColor={gradient.color2} />
    </>
  )
  const v = gradientVector(gradient.angle)
  return (
    <>
      <defs>
        {gradient.type === 'radial' ? (
          <radialGradient id={id} cx="50%" cy="50%" r="50%">{stops}</radialGradient>
        ) : (
          <linearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>{stops}</linearGradient>
        )}
      </defs>
      <rect
        x={0} y={0} width={canvasWidth} height={canvasHeight}
        fill={`url(#${id})`}
        style={{ pointerEvents: 'none' }}
        data-layer="background-gradient"
      />
    </>
  )
})

// Full-canvas color overlay painted over the background (under every other
// layer) to improve text legibility. Solid is a single color; linear/radial are
// two-stop gradients whose stops carry their own alpha. The blend mode applies
// to the overlay rect, so e.g. "multiply" darkens only the background beneath.
// pointer-events stay off so clicks fall through to the canvas for deselection.
const ColorOverlay = memo(function ColorOverlay({ overlay, canvasWidth, canvasHeight }) {
  if (!overlay || !overlay.enabled) return null
  const blend = overlay.blendMode && overlay.blendMode !== 'normal' ? overlay.blendMode : undefined

  if (overlay.type === 'solid') {
    return (
      <rect
        x={0} y={0} width={canvasWidth} height={canvasHeight}
        fill={overlay.color}
        opacity={clampOpacity(overlay.opacity)}
        style={{ mixBlendMode: blend, pointerEvents: 'none' }}
        data-layer="overlay"
      />
    )
  }

  const gradId = 'overlay-gradient'
  const stops = (
    <>
      <stop offset="0%" stopColor={overlay.color} stopOpacity={clampOpacity(overlay.opacity)} />
      <stop offset="100%" stopColor={overlay.color2} stopOpacity={clampOpacity(overlay.opacity2)} />
    </>
  )
  const v = gradientVector(overlay.angle)
  return (
    <>
      <defs>
        {overlay.type === 'radial' ? (
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">{stops}</radialGradient>
        ) : (
          <linearGradient id={gradId} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>{stops}</linearGradient>
        )}
      </defs>
      <rect
        x={0} y={0} width={canvasWidth} height={canvasHeight}
        fill={`url(#${gradId})`}
        style={{ mixBlendMode: blend, pointerEvents: 'none' }}
        data-layer="overlay"
      />
    </>
  )
})

// The SVG canvas. Accepts interactive props (selection ids, event handlers) for
// use inside the editor; pass nulls/no-ops for headless rendering.
export function SVGCanvas({ state, selectedTextId, selectedImageId, selectedShapeId, onSelectText, onSelectImage, onSelectShape, onDragText, onDragImage, onDragShape, onResizeImage, onContextMenuLayer, displayWidth, displayHeight }) {
  const svgRef = useRef(null)
  const [textBox, setTextBox] = useState(null)

  // Measure the selected text's real bounds (accounts for anchor, font, and
  // weight) instead of approximating, so the outline lines up exactly. Runs in
  // SVG user space, so it is independent of the on-screen scale.
  useLayoutEffect(() => {
    if (!selectedTextId || !svgRef.current) { setTextBox(null); return }
    const node = svgRef.current.querySelector(`[data-text-id="${selectedTextId}"]`)
    if (!node) { setTextBox(null); return }
    const b = node.getBBox()
    setTextBox({ x: b.x, y: b.y, width: b.width, height: b.height })
  }, [selectedTextId, state.texts])

  const bgFilters = state.backgroundFilters || DEFAULT_FILTERS
  const bgFilterActive = isFilterActive(bgFilters)
  const bgFilterRef = bgFilterActive ? 'url(#bg-filter)' : undefined
  const bgTransfer = brightnessContrastTransfer(bgFilters.brightness, bgFilters.contrast)

  const cw = state.canvasWidth || DEFAULT_CANVAS_WIDTH
  const ch = state.canvasHeight || DEFAULT_CANVAS_HEIGHT

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${cw} ${ch}`}
      style={{ display: 'block', background: '#ffffff' }}
      role="group"
      aria-label="Cover canvas"
      onClick={(e) => {
        if (e.target.tagName === 'svg') {
          onSelectText?.(null)
          onSelectImage?.(null)
          onSelectShape?.(null)
        }
      }}
      onContextMenu={(e) => {
        const el = e.target.closest && e.target.closest('[data-text-id],[data-image-id],[data-shape-id]')
        if (!el) return
        e.preventDefault()
        const d = el.dataset
        if (d.textId !== undefined) onContextMenuLayer?.('text', Number(d.textId), e.clientX, e.clientY)
        else if (d.imageId !== undefined) onContextMenuLayer?.('image', Number(d.imageId), e.clientX, e.clientY)
        else if (d.shapeId !== undefined) onContextMenuLayer?.('shape', Number(d.shapeId), e.clientX, e.clientY)
      }}
    >
      <defs>
        <clipPath id="canvas-clip">
          <rect x={0} y={0} width={cw} height={ch} />
        </clipPath>
        {bgFilterActive && (
          <filter id="bg-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values={bgFilters.saturate} />
            <feComponentTransfer>
              <feFuncR type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
              <feFuncG type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
              <feFuncB type="linear" slope={bgTransfer.slope} intercept={bgTransfer.intercept} />
            </feComponentTransfer>
            {bgFilters.blur > 0 && <feGaussianBlur stdDeviation={bgFilters.blur} />}
          </filter>
        )}
        {state.texts.map(t => {
          const s = textShadowFilter(t)
          if (!s) return null
          return (
            <filter key={s.id} id={s.id} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={s.dx} dy={s.dy} stdDeviation={s.stdDeviation} floodColor={s.color} floodOpacity="1" />
            </filter>
          )
        })}
      </defs>

      <GradientBackground gradient={state.backgroundGradient} canvasWidth={cw} canvasHeight={ch} />

      {state.backgroundImageData && (() => {
        const nW = state.backgroundNaturalWidth
        const nH = state.backgroundNaturalHeight
        // Fall back to slice when the natural size is unknown (e.g. an image
        // supplied via initialState rather than the uploader).
        if (!nW || !nH) {
          return (
            <image
              href={state.backgroundImageData}
              x={0} y={0} width={cw} height={ch}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#canvas-clip)"
              filter={bgFilterRef}
              data-layer="background"
            />
          )
        }
        const c = backgroundCrop(nW, nH, cw, ch, state.backgroundTransform || undefined)
        return (
          <image
            href={state.backgroundImageData}
            x={c.x} y={c.y} width={c.width} height={c.height}
            preserveAspectRatio="none"
            clipPath="url(#canvas-clip)"
            filter={bgFilterRef}
            data-layer="background"
          />
        )
      })()}

      <ColorOverlay overlay={state.overlay} canvasWidth={cw} canvasHeight={ch} />

      {(state.images || []).filter(image => !image.hidden).map((image) => (
        <ImageElement
          key={image.id}
          image={image}
          selected={image.id === selectedImageId}
          locked={!!image.locked}
          onSelect={onSelectImage}
          onDrag={onDragImage}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      {(state.shapes || []).filter(shape => !shape.hidden).map((shape) => (
        <ShapeElement
          key={shape.id}
          shape={shape}
          selected={shape.id === selectedShapeId}
          locked={!!shape.locked}
          onSelect={onSelectShape}
          onDrag={onDragShape}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      <GridOverlay grid={state.grid} canvasWidth={cw} canvasHeight={ch} />

      {state.texts.filter(text => !text.hidden).map((text) => (
        <TextElement
          key={text.id}
          text={text}
          selected={text.id === selectedTextId}
          locked={!!text.locked}
          onSelect={onSelectText}
          onDrag={onDragText}
          snapToGrid={state.snapToGrid}
          gridSpacing={state.grid.spacing}
          canvasWidth={cw}
          canvasHeight={ch}
        />
      ))}

      {selectedImageId && (state.images || []).find(i => i.id === selectedImageId && !i.hidden) && (() => {
        const img = state.images.find(i => i.id === selectedImageId)
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : img.width / img.height
        return (
          <g data-layer="selection">
            <rect
              x={img.x}
              y={img.y}
              width={img.width}
              height={img.height}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
            {!img.locked && <ResizeHandles box={img} ratio={ratio} onResize={(patch) => onResizeImage(img.id, patch)} />}
          </g>
        )
      })()}

      {selectedShapeId && (state.shapes || []).find(s => s.id === selectedShapeId && !s.hidden) && (() => {
        const shape = state.shapes.find(s => s.id === selectedShapeId)
        return (
          <rect
            data-layer="selection"
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}

      {textBox && selectedTextId && state.texts.some(t => t.id === selectedTextId && !t.hidden) && (() => {
        const pad = 4
        return (
          <rect
            data-layer="selection"
            x={textBox.x - pad}
            y={textBox.y - pad}
            width={textBox.width + pad * 2}
            height={textBox.height + pad * 2}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )
      })()}
    </svg>
  )
}
